package com.nansogong.service;

import com.nansogong.common.AppProperties;
import com.nansogong.dto.AuthPhoneChallengeResponse;
import com.nansogong.dto.AuthPhoneConfirmationRequest;
import com.nansogong.dto.AuthPhoneConfirmationResponse;
import com.nansogong.dto.AuthPhoneRequest;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.DefaultRedisScript;
import org.springframework.http.HttpStatus;
import org.springframework.core.env.Environment;
import org.springframework.core.env.Profiles;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.MessageDigest;
import java.time.Duration;
import java.time.Instant;
import java.util.HexFormat;
import java.util.List;
import java.util.UUID;

/** 가입 목적의 휴대전화 증명. REAL은 SMS 수신, MOCK은 로컬 개발용 코드만 허용한다. */
@Service
public class AuthPhoneVerificationService {

    private static final Duration CHALLENGE_TTL = Duration.ofMinutes(3);
    private static final Duration PROOF_TTL = Duration.ofMinutes(10);
    private static final DefaultRedisScript<Long> CONFIRM = new DefaultRedisScript<>("""
            if redis.call('GET', KEYS[1]) ~= ARGV[1] then return -1 end
            local attempts = redis.call('INCR', KEYS[2])
            if attempts == 1 then redis.call('PEXPIRE', KEYS[2], redis.call('PTTL', KEYS[1])) end
            if attempts > 5 then redis.call('DEL', KEYS[1], KEYS[2]); return -2 end
            if ARGV[2] ~= 'yes' then return 0 end
            redis.call('DEL', KEYS[1], KEYS[2])
            return 1
            """, Long.class);
    private static final DefaultRedisScript<Long> CLAIM = new DefaultRedisScript<>("""
            if redis.call('GET', KEYS[1]) ~= ARGV[1] then return -1 end
            local ttl = redis.call('PTTL', KEYS[1])
            if ttl <= 0 then return -1 end
            redis.call('DEL', KEYS[1])
            return ttl
            """, Long.class);

    private final StringRedisTemplate redis;
    private final AppProperties props;
    private final AuthSmsVerificationService sms;
    private final Environment environment;

    public AuthPhoneVerificationService(StringRedisTemplate redis, AppProperties props, AuthSmsVerificationService sms, Environment environment) {
        this.redis = redis;
        this.props = props; this.sms = sms; this.environment = environment;
    }

    public AuthPhoneChallengeResponse requestCode(AuthPhoneRequest request) { return requestCode(request, "unknown"); }

    public AuthPhoneChallengeResponse requestCode(AuthPhoneRequest request, String remoteAddress) {
        if (realMode()) return sms.request(AuthSmsVerificationService.Purpose.SIGNUP, request.name(), request.phone(), remoteAddress);
        requireMockMode();
        String challengeId = UUID.randomUUID().toString();
        redis.opsForValue().set(challengeKey(challengeId), fingerprint(request.name(), request.phone()), CHALLENGE_TTL);
        return new AuthPhoneChallengeResponse(challengeId, Instant.now().plus(CHALLENGE_TTL).toEpochMilli());
    }

    public AuthPhoneConfirmationResponse confirm(UUID challengeId, AuthPhoneConfirmationRequest request) {
        if (realMode()) {
            var proof = sms.confirm(AuthSmsVerificationService.Purpose.SIGNUP, request.name(), request.phone(), challengeId, request.code());
            return new AuthPhoneConfirmationResponse(proof.token(), proof.expiresAt(), request.phone(), request.name());
        }
        requireMockMode();
        String identity = fingerprint(request.name(), request.phone());
        String key = challengeKey(challengeId.toString());
        Long result = redis.execute(CONFIRM, List.of(key, key + ":attempts"), identity,
                request.code().equals(props.verification().mockCode()) ? "yes" : "no");
        if (Long.valueOf(-2).equals(result)) throw invalidProof("인증 시도 횟수를 초과했어요. 인증번호를 다시 요청해 주세요");
        if (Long.valueOf(-1).equals(result) || result == null) throw invalidProof("인증 요청이 만료되었거나 정보가 변경되었어요. 다시 요청해 주세요");
        if (result == 0) throw invalidProof("인증번호가 일치하지 않아요");

        String token = UUID.randomUUID().toString();
        Instant verifiedAt = Instant.now();
        redis.opsForValue().set(proofKey(token), identity + ":" + verifiedAt.toEpochMilli(), PROOF_TTL);
        return new AuthPhoneConfirmationResponse(token, verifiedAt.plus(PROOF_TTL).toEpochMilli(), request.phone(), request.name());
    }

    public AuthPhoneProof requireProof(String token, String name, String phone) {
        if (realMode()) {
            var proof = sms.requireProof(token, AuthSmsVerificationService.Purpose.SIGNUP, name, phone);
            return new AuthPhoneProof(proof.key(), proof.value(), proof.verifiedAt());
        }
        requireMockMode();
        String key = proofKey(token);
        String value = redis.opsForValue().get(key);
        if (value == null || !value.startsWith(fingerprint(name, phone) + ":")) throw expiredProof();
        return new AuthPhoneProof(key, value, Instant.ofEpochMilli(Long.parseLong(value.substring(value.indexOf(':') + 1))));
    }

    /** 동시에 같은 증명으로 가입해도 한 요청만 사용한다. DB 실패 시 원래 만료 시각까지만 복구한다. */
    public AuthPhoneClaim claim(AuthPhoneProof proof) {
        Instant expiresAt = proof.verifiedAt().plus(PROOF_TTL);
        if (!expiresAt.isAfter(Instant.now())) throw expiredProof();
        Long ttl = redis.execute(CLAIM, List.of(proof.key()), proof.value());
        if (ttl == null || ttl <= 0) throw expiredProof();
        return new AuthPhoneClaim(proof, expiresAt);
    }

    public void restore(AuthPhoneClaim claim) {
        Duration remaining = Duration.between(Instant.now(), claim.expiresAt());
        if (remaining.toMillis() > 0) {
            redis.opsForValue().setIfAbsent(claim.proof().key(), claim.proof().value(), remaining);
        }
    }

    private boolean realMode() { return props.verification().mode() == AppProperties.Verification.Mode.REAL; }

    private void requireMockMode() {
        if (props.verification().mode() != AppProperties.Verification.Mode.MOCK || props.verification().mockCode() == null || environment.acceptsProfiles(Profiles.of("aws", "prod"))) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "실제 휴대전화 인증은 아직 연결되지 않았어요");
        }
    }

    private String fingerprint(String name, String phone) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(props.jwt().secret().getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            return HexFormat.of().formatHex(mac.doFinal(("phone-verification\n" + name + "\n" + phone).getBytes(StandardCharsets.UTF_8)));
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException("인증 설정을 확인할 수 없습니다");
        }
    }

    private String proofKey(String token) {
        try {
            return "auth:phone:proof:" + HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(token.getBytes(StandardCharsets.UTF_8)));
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException("인증 설정을 확인할 수 없습니다");
        }
    }

    private String challengeKey(String challengeId) { return "auth:phone:challenge:{" + challengeId + "}"; }
    private ResponseStatusException expiredProof() { return invalidProof("휴대전화 인증이 만료되었거나 이미 사용됐어요. 회원정보 단계에서 다시 인증해 주세요"); }
    private ResponseStatusException invalidProof(String message) { return new ResponseStatusException(HttpStatus.BAD_REQUEST, message); }

    public record AuthPhoneProof(String key, String value, Instant verifiedAt) {}
    public record AuthPhoneClaim(AuthPhoneProof proof, Instant expiresAt) {}
}
