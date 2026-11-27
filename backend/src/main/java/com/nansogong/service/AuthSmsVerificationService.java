package com.nansogong.service;

import com.nansogong.dto.AuthPhoneChallengeResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.DefaultRedisScript;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

/** 실제 SMS의 발송부와 독립적인 인증 상태 처리. 번호·코드 원문은 Redis·응답·로그에 남기지 않는다. */
@Service
@RequiredArgsConstructor
public class AuthSmsVerificationService {
    private static final SecureRandom RANDOM = new SecureRandom();
    private static final Duration CHALLENGE_TTL = Duration.ofMinutes(3);
    private static final DefaultRedisScript<Long> LIMIT = new DefaultRedisScript<>("""
            local count = redis.call('INCR', KEYS[1])
            if count == 1 then redis.call('PEXPIRE', KEYS[1], 600000) end
            return count
            """, Long.class);
    private static final DefaultRedisScript<Long> START = new DefaultRedisScript<>("""
            if redis.call('HGET', KEYS[1], 'phase') == 'SENDING' then return 0 end
            redis.call('DEL', KEYS[1])
            redis.call('HSET', KEYS[1], 'id', ARGV[1], 'code', ARGV[2], 'attempts', '0', 'phase', 'SENDING')
            redis.call('PEXPIRE', KEYS[1], ARGV[3]); return 1
            """, Long.class);
    private static final DefaultRedisScript<Long> DELIVERED = new DefaultRedisScript<>("""
            if redis.call('HGET', KEYS[1], 'id') ~= ARGV[1] then return 0 end
            if ARGV[2] ~= 'yes' then redis.call('DEL', KEYS[1]); return 0 end
            redis.call('HSET', KEYS[1], 'phase', 'SENT'); return 1
            """, Long.class);
    private static final DefaultRedisScript<Long> CONFIRM = new DefaultRedisScript<>("""
            if redis.call('HGET', KEYS[1], 'id') ~= ARGV[1] or redis.call('HGET', KEYS[1], 'phase') ~= 'SENT' then return -1 end
            local attempts = redis.call('HINCRBY', KEYS[1], 'attempts', 1)
            if attempts > 5 then redis.call('DEL', KEYS[1]); return -1 end
            if redis.call('HGET', KEYS[1], 'code') ~= ARGV[2] then
                if attempts >= 5 then redis.call('DEL', KEYS[1]) end
                return 0
            end
            redis.call('DEL', KEYS[1]); return 1
            """, Long.class);
    private static final DefaultRedisScript<Long> CLAIM = new DefaultRedisScript<>("""
            if redis.call('GET', KEYS[1]) ~= ARGV[1] then return 0 end
            redis.call('DEL', KEYS[1]); return 1
            """, Long.class);
    private final StringRedisTemplate redis;
    private final AuthCredentialService credentials;
    private final AuthSmsDeliveryService delivery;

    /** 기존 재설정의 10분당 계정 3회·IP 20회 제한을 적용하고 수신 번호도 3회로 제한한다. */
    public AuthPhoneChallengeResponse request(Purpose purpose, String binding, String phone, String remoteAddress) {
        delivery.requireAvailable();
        limit("client", remoteAddress == null ? "unknown" : remoteAddress, 20);
        limit("binding", purpose + "\n" + binding, 3);
        limit("recipient", phone, 3);
        String id = UUID.randomUUID().toString();
        String code = String.format(Locale.ROOT, "%06d", RANDOM.nextInt(1_000_000));
        String key = challengeKey(purpose, binding, phone);
        Instant expires = Instant.now().plus(CHALLENGE_TTL);
        if (!Long.valueOf(1).equals(redis.execute(START, List.of(key), id, codeHash(id, code), Long.toString(CHALLENGE_TTL.toMillis())))) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "문자를 발송 중이에요. 잠시 후 다시 시도해 주세요");
        }
        // 재발송 예약 시 이전 코드를 먼저 폐기한다. 실패·시간 초과에도 이전 코드를 되살리지 않는다.
        try {
            delivery.send(phone, code);
            if (!Long.valueOf(1).equals(redis.execute(DELIVERED, List.of(key), id, "yes"))) throw invalid();
        } catch (RuntimeException failure) {
            redis.execute(DELIVERED, List.of(key), id, "no");
            throw failure;
        }
        return new AuthPhoneChallengeResponse(id, expires.toEpochMilli());
    }

    public ProofToken confirm(Purpose purpose, String binding, String phone, UUID challengeId, String code) {
        delivery.requireAvailable();
        if (code == null || !code.matches("[0-9]{6}")) throw invalid();
        Long result = redis.execute(CONFIRM, List.of(challengeKey(purpose, binding, phone)), challengeId.toString(), codeHash(challengeId.toString(), code));
        if (!Long.valueOf(1).equals(result)) throw invalid();
        String token = UUID.randomUUID().toString();
        Instant now = Instant.now();
        String value = identity(purpose, binding, phone) + "|" + now.toEpochMilli();
        redis.opsForValue().set(proofKey(token), value, purpose.proofTtl);
        return new ProofToken(token, now.plus(purpose.proofTtl).toEpochMilli());
    }

    public VerifiedProof requireProof(String token, Purpose purpose, String binding, String phone) {
        delivery.requireAvailable();
        if (token == null || token.length() > 200) throw invalid();
        String key = proofKey(token), value = redis.opsForValue().get(key);
        String expected = identity(purpose, binding, phone);
        if (value == null || !value.startsWith(expected + "|")) throw invalid();
        try {
            Instant verified = Instant.ofEpochMilli(Long.parseLong(value.substring(65)));
            if (!verified.plus(purpose.proofTtl).isAfter(Instant.now())) throw invalid();
            return new VerifiedProof(key, value, verified);
        } catch (NumberFormatException malformed) { throw invalid(); }
    }
    public void claim(VerifiedProof proof) {
        if (!Long.valueOf(1).equals(redis.execute(CLAIM, List.of(proof.key()), proof.value()))) throw invalid();
    }
    private void limit(String scope, String value, long max) {
        Long count = redis.execute(LIMIT, List.of("auth:sms:rate:" + credentials.fingerprint("sms-rate-" + scope, value)));
        if (count == null || count > max) throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "인증 요청 횟수를 초과했어요. 잠시 후 다시 시도해 주세요");
    }
    private String identity(Purpose purpose, String binding, String phone) {
        return credentials.fingerprint("sms-identity", purpose + "\n" + binding + "\n" + phone);
    }
    private String challengeKey(Purpose purpose, String binding, String phone) {
        return "auth:sms:{" + identity(purpose, binding, phone) + "}:challenge";
    }
    private String proofKey(String token) { return "auth:sms:proof:" + credentials.fingerprint("sms-proof", token); }
    private String codeHash(String id, String code) { return credentials.fingerprint("sms-code", id + "\n" + code); }
    private ResponseStatusException invalid() {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, "인증번호가 다르거나 인증이 만료·사용되었어요. 다시 인증해 주세요");
    }
    public enum Purpose {
        SIGNUP(Duration.ofMinutes(10)), PASSWORD_RESET(Duration.ofMinutes(5)), PHONE_CHANGE(Duration.ofMinutes(5));
        private final Duration proofTtl;
        Purpose(Duration proofTtl) { this.proofTtl = proofTtl; }
    }
    public record ProofToken(String token, long expiresAt) {
        @Override public String toString() { return "ProofToken[redacted]"; }
    }
    public record VerifiedProof(String key, String value, Instant verifiedAt) {
        @Override public String toString() { return "VerifiedProof[redacted]"; }
    }
}
