package com.nansogong.service;

import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.DefaultRedisScript;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/** Redis에는 Refresh 원문 대신 HMAC만 보관한다. 회전·재사용 탐지·종료는 세션별 원자 연산이다. */
@Service
@RequiredArgsConstructor
public class AuthSessionStore {
    private static final SecureRandom RANDOM = new SecureRandom();
    private static final DefaultRedisScript<Long> CREATE = new DefaultRedisScript<>("""
            if redis.call('EXISTS', KEYS[1]) == 1 then return 0 end
            redis.call('HSET', KEYS[1], 'memberId', ARGV[1], 'version', ARGV[2],
                'current', ARGV[3], 'expiresAt', ARGV[4], 'remember', ARGV[5], 'revoked', '0')
            redis.call('PEXPIREAT', KEYS[1], ARGV[4]); return 1
            """, Long.class);
    private static final DefaultRedisScript<String> ROTATE = new DefaultRedisScript<>("""
            if redis.call('EXISTS', KEYS[1]) == 0 or redis.call('HGET', KEYS[1], 'revoked') ~= '0'
                or tonumber(redis.call('HGET', KEYS[1], 'expiresAt')) <= tonumber(ARGV[3]) then return 'INVALID' end
            if redis.call('HGET', KEYS[1], 'current') ~= ARGV[1] then
                if redis.call('HEXISTS', KEYS[1], 'used:' .. ARGV[1]) == 1 then
                    redis.call('HSET', KEYS[1], 'revoked', '1'); return 'REUSED'
                end
                return 'INVALID'
            end
            redis.call('HSET', KEYS[1], 'used:' .. ARGV[1], '1', 'current', ARGV[2])
            return 'OK'
            """, String.class);
    private static final DefaultRedisScript<Long> REVOKE = new DefaultRedisScript<>("""
            if redis.call('EXISTS', KEYS[1]) == 0 then return 0 end
            redis.call('HSET', KEYS[1], 'revoked', '1'); return 1
            """, Long.class);
    private final StringRedisTemplate redis;
    private final AuthCredentialService credentials;

    public Issued create(Long memberId, String version, Duration lifetime, boolean remember) {
        if (lifetime.isNegative() || lifetime.isZero()) throw new IllegalArgumentException("세션 유효기간을 확인해 주세요");
        String id = UUID.randomUUID().toString();
        String token = token(id);
        Instant expires = Instant.now().plus(lifetime);
        Long saved = redis.execute(CREATE, List.of(key(id)), memberId.toString(), version, digest(token),
                Long.toString(expires.toEpochMilli()), Boolean.toString(remember));
        if (!Long.valueOf(1).equals(saved)) throw new IllegalStateException("로그인 세션을 생성하지 못했어요");
        return new Issued(token, new Session(id, memberId, version, expires, remember, false));
    }

    public Rotation rotate(String supplied) {
        String id = sessionId(supplied);
        if (id == null) return new Rotation(Result.INVALID, null);
        String next = token(id);
        String result = redis.execute(ROTATE, List.of(key(id)), digest(supplied), digest(next), Long.toString(System.currentTimeMillis()));
        if (!"OK".equals(result)) return new Rotation("REUSED".equals(result) ? Result.REUSED : Result.INVALID, null);
        Session session = find(id);
        if (session == null || session.revoked()) return new Rotation(Result.INVALID, null);
        return new Rotation(Result.OK, new Issued(next, session));
    }

    public Session find(String id) {
        if (!validId(id)) return null;
        Map<Object, Object> state = redis.opsForHash().entries(key(id));
        if (state.isEmpty()) return null;
        try {
            Session session = new Session(id, Long.valueOf((String) state.get("memberId")), (String) state.get("version"),
                    Instant.ofEpochMilli(Long.parseLong((String) state.get("expiresAt"))),
                    Boolean.parseBoolean((String) state.get("remember")), !"0".equals(state.get("revoked")));
            return session.expiresAt().isAfter(Instant.now()) ? session : null;
        } catch (IllegalArgumentException | NullPointerException malformed) { return null; }
    }

    /** 알 수 없는 임의 토큰으로 세션을 종료시킬 수 없다. 이미 회전한 진짜 토큰은 종료할 수 있다. */
    public boolean recognizes(String supplied) {
        String id = sessionId(supplied);
        if (id == null) return false;
        String hash = digest(supplied);
        return credentials.matches((String) redis.opsForHash().get(key(id), "current"), hash)
                || Boolean.TRUE.equals(redis.opsForHash().hasKey(key(id), "used:" + hash));
    }

    public void revoke(String id) {
        if (validId(id)) redis.execute(REVOKE, List.of(key(id)));
    }
    public static String sessionId(String token) {
        if (token == null || token.length() != 80 || token.charAt(36) != '.') return null;
        String id = token.substring(0, 36);
        return validId(id) && token.substring(37).matches("[A-Za-z0-9_-]{43}") ? id : null;
    }
    private static boolean validId(String id) {
        return id != null && id.matches("[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}");
    }
    private String token(String id) {
        byte[] bytes = new byte[32]; RANDOM.nextBytes(bytes);
        return id + "." + Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }
    private String digest(String token) { return credentials.fingerprint("refresh-token", token); }
    private String key(String id) { return "auth:session:{" + id + "}"; }
    public enum Result { OK, INVALID, REUSED }
    public record Session(String id, Long memberId, String version, Instant expiresAt, boolean remember, boolean revoked) {}
    public record Issued(String refreshToken, Session session) {
        @Override public String toString() { return "Issued[redacted]"; }
    }
    public record Rotation(Result result, Issued issued) {}
}
