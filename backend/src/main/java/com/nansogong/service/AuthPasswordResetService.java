package com.nansogong.service;

import com.nansogong.common.AppProperties;
import com.nansogong.dto.AuthPhoneChallengeResponse;
import com.nansogong.dto.AuthPasswordResetStartRequest;
import com.nansogong.dto.AuthPasswordResetConfirmationRequest;
import com.nansogong.dto.AuthPasswordResetProofResponse;
import com.nansogong.dto.AuthPasswordResetCompletionRequest;
import com.nansogong.model.Member;
import com.nansogong.model.MemberStatus;
import com.nansogong.repository.MemberRepository;
import org.springframework.core.env.Environment;
import org.springframework.core.env.Profiles;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.DefaultRedisScript;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/** 공개된 개발용 코드는 고정 데모 ID·가짜 전화번호에만 허용한다. 일반 가입 계정에는 증명을 발급하지 않는다. */
@Service
public class AuthPasswordResetService {
    private static final Duration CHALLENGE_TTL = Duration.ofMinutes(3);
    private static final Duration PROOF_TTL = Duration.ofMinutes(5);
    private static final Map<String, String> DEMO_PHONES = Map.of(
            "demo-office", "01000009001", "demo-campus", "01000009002", "demo-home", "01000009003");
    private static final DefaultRedisScript<Long> LIMIT = new DefaultRedisScript<>("""
            local count = redis.call('INCR', KEYS[1])
            if count == 1 then redis.call('PEXPIRE', KEYS[1], ARGV[1]) end
            return count
            """, Long.class);
    private static final DefaultRedisScript<String> CONFIRM = new DefaultRedisScript<>("""
            local value = redis.call('GET', KEYS[1])
            if not value then return '' end
            local attempts = redis.call('INCR', KEYS[2])
            if attempts == 1 then redis.call('PEXPIRE', KEYS[2], redis.call('PTTL', KEYS[1])) end
            if attempts > 5 then redis.call('DEL', KEYS[1], KEYS[2]); return '' end
            if string.sub(value, 1, 64) ~= ARGV[1] or ARGV[2] ~= 'yes' or string.sub(value, 66, 67) == '0|' then
                if attempts == 5 then redis.call('DEL', KEYS[1], KEYS[2]) end
                return ''
            end
            redis.call('DEL', KEYS[1], KEYS[2])
            return value
            """, String.class);
    private final MemberRepository members;
    private final StringRedisTemplate redis;
    private final AppProperties props;
    private final Environment environment;
    private final AuthCredentialService credentials;
    private final PasswordEncoder passwords;
    private final AuthPasswordResetPersistenceService persistence;
    private final AuthSmsVerificationService sms;
    private final AuthSmsDeliveryService delivery;

    public AuthPasswordResetService(MemberRepository members, StringRedisTemplate redis, AppProperties props,
            Environment environment, AuthCredentialService credentials, PasswordEncoder passwords, AuthPasswordResetPersistenceService persistence, AuthSmsVerificationService sms, AuthSmsDeliveryService delivery) {
        this.members = members; this.redis = redis; this.props = props; this.environment = environment;
        this.credentials = credentials; this.passwords = passwords; this.persistence = persistence; this.sms = sms; this.delivery = delivery;
    }

    public AuthPhoneChallengeResponse request(AuthPasswordResetStartRequest request, String remoteAddress) {
        if (realMode()) return requestReal(request, remoteAddress);
        requireDemoMode();
        limit("client", remoteAddress == null ? "unknown" : remoteAddress, 20);
        limit("account", request.loginId(), 3);
        String identity = identity(request.loginId(), request.phone());
        var member = members.findByLoginId(request.loginId()).filter(m -> demoEligible(m, request.phone()));
        // 대상이 없어도 같은 형태·만료 시간의 요청을 만든다. 조회 결과를 외부에 알리지 않는다.
        String state = member.map(m -> identity + "|" + m.getId() + "|" + credentials.version(m))
                .orElseGet(() -> identity + "|0|" + UUID.randomUUID());
        String challengeId = UUID.randomUUID().toString();
        redis.opsForValue().set(challengeKey(challengeId), state, CHALLENGE_TTL);
        return new AuthPhoneChallengeResponse(challengeId, Instant.now().plus(CHALLENGE_TTL).toEpochMilli());
    }

    public AuthPasswordResetProofResponse confirm(UUID challengeId, AuthPasswordResetConfirmationRequest request) {
        if (realMode()) {
            delivery.requireAvailable();
            var member = members.findByLoginId(request.loginId()).filter(m -> eligible(m, request.phone())).orElseThrow(this::invalid);
            var proof = sms.confirm(AuthSmsVerificationService.Purpose.PASSWORD_RESET, binding(member), request.phone(), challengeId, request.code());
            redis.opsForValue().set(realProofKey(proof.token()), member.getId() + "|" + credentials.version(member), PROOF_TTL);
            return new AuthPasswordResetProofResponse(proof.token(), proof.expiresAt());
        }
        requireDemoMode();
        String key = challengeKey(challengeId.toString());
        String state = redis.execute(CONFIRM, List.of(key, key + ":attempts"), identity(request.loginId(), request.phone()),
                request.code().equals(props.verification().mockCode()) ? "yes" : "no");
        if (state == null || state.isEmpty()) throw invalid();
        String token = UUID.randomUUID().toString();
        redis.opsForValue().set(proofKey(token), state, PROOF_TTL);
        return new AuthPasswordResetProofResponse(token, Instant.now().plus(PROOF_TTL).toEpochMilli());
    }

    public void complete(AuthPasswordResetCompletionRequest request) {
        if (realMode()) delivery.requireAvailable(); else requireDemoMode();
        if (!request.password().equals(request.passwordConfirm())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "비밀번호가 일치하지 않아요");
        }
        if (request.password().getBytes(StandardCharsets.UTF_8).length > 72) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "비밀번호가 너무 길어요. 영문·숫자·기호로 줄여 주세요");
        }
        if (realMode()) {
            String state = redis.opsForValue().get(realProofKey(request.resetToken()));
            if (state == null) throw invalid();
            String[] fields = state.split("\\|", -1);
            if (fields.length != 2 || !fields[0].matches("[1-9][0-9]*")) throw invalid();
            var member = members.findById(Long.valueOf(fields[0])).filter(m -> m.getStatus() == MemberStatus.ACTIVE).orElseThrow(this::invalid);
            if (!credentials.matches(credentials.version(member), fields[1])) throw invalid();
            var proof = sms.requireProof(request.resetToken(), AuthSmsVerificationService.Purpose.PASSWORD_RESET, binding(member), normalizedPhone(member));
            persistence.completeReal(member.getId(), fields[1], normalizedPhone(member), proof, passwords.encode(request.password()));
            redis.delete(realProofKey(request.resetToken()));
            return;
        }
        String key = proofKey(request.resetToken());
        String state = redis.opsForValue().get(key);
        if (state == null) throw invalid();
        String[] values = state.split("\\|", -1);
        if (values.length != 3 || !values[1].matches("[1-9][0-9]*")) throw invalid();
        persistence.complete(Long.valueOf(values[1]), values[2], key, state, passwords.encode(request.password()));
    }

    private boolean realMode() { return props.verification().mode() == AppProperties.Verification.Mode.REAL; }
    private AuthPhoneChallengeResponse requestReal(AuthPasswordResetStartRequest request, String remoteAddress) {
        delivery.requireAvailable();
        limit("client", remoteAddress == null ? "unknown" : remoteAddress, 20);
        limit("account", request.loginId(), 3);
        var member = members.findByLoginId(request.loginId()).filter(m -> eligible(m, request.phone()));
        if (member.isEmpty()) return new AuthPhoneChallengeResponse(UUID.randomUUID().toString(), Instant.now().plus(CHALLENGE_TTL).toEpochMilli());
        return sms.request(AuthSmsVerificationService.Purpose.PASSWORD_RESET, binding(member.get()), request.phone(), remoteAddress);
    }
    private boolean eligible(Member member, String phone) { return member.getStatus() == MemberStatus.ACTIVE && normalizedPhone(member).equals(phone); }
    private String normalizedPhone(Member member) { return member.getPhone().replaceAll("[-\\s]", ""); }
    private String binding(Member member) { return member.getId() + "\n" + credentials.version(member); }
    private String realProofKey(String token) { return "auth:password-reset:real-proof:" + credentials.fingerprint("password-reset-real-proof", token); }

    public static boolean demoEligible(Member member, String phone) {
        String expected = DEMO_PHONES.get(member.getLoginId());
        return member.getStatus() == MemberStatus.ACTIVE && expected != null && expected.equals(phone)
                && expected.equals(member.getPhone().replaceAll("[-\\s]", ""));
    }

    private void requireDemoMode() {
        if (props.verification().mode() != AppProperties.Verification.Mode.MOCK
                || props.verification().mockCode() == null || environment.acceptsProfiles(Profiles.of("aws", "prod"))) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "실제 문자 인증 연결 후 비밀번호 재설정을 이용할 수 있어요");
        }
    }
    private void limit(String scope, String value, long max) {
        String key = "auth:password-reset:rate:" + credentials.fingerprint(scope, value);
        Long count = redis.execute(LIMIT, List.of(key), "600000");
        if (count == null || count > max) throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "요청 횟수를 초과했어요. 잠시 후 다시 시도해 주세요");
    }
    private String identity(String loginId, String phone) { return credentials.fingerprint("password-reset-identity", loginId + "\n" + phone); }
    private String challengeKey(String id) { return "auth:password-reset:challenge:{" + id + "}"; }
    private String proofKey(String token) { return "auth:password-reset:proof:" + credentials.fingerprint("password-reset-proof", token); }
    private ResponseStatusException invalid() {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, "인증 정보를 확인할 수 없어요. 아이디·전화번호를 확인하고 인증을 다시 진행해 주세요");
    }
}
