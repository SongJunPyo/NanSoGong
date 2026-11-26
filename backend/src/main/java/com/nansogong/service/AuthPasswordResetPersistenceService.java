package com.nansogong.service;

import com.nansogong.repository.MemberRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.DefaultRedisScript;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.util.List;

@Service
@RequiredArgsConstructor
public class AuthPasswordResetPersistenceService {
    private static final DefaultRedisScript<Long> CONSUME = new DefaultRedisScript<>("""
            if redis.call('GET', KEYS[1]) ~= ARGV[1] then return 0 end
            redis.call('DEL', KEYS[1]); return 1
            """, Long.class);
    private final MemberRepository members;
    private final AuthCredentialService credentials;
    private final StringRedisTemplate redis;

    /** DB 행 잠금으로 여러 증명의 동시 사용도 차단한다. 실패 시 재인증하며 증명을 되살리지 않는다. */
    @Transactional
    public void complete(Long memberId, String version, String key, String state, String passwordHash) {
        var member = members.findForPasswordReset(memberId).orElseThrow(this::invalid);
        if (!AuthPasswordResetService.demoEligible(member, member.getPhone().replaceAll("[-\\s]", ""))
                || !credentials.matches(credentials.version(member), version)) throw invalid();
        if (!Long.valueOf(1).equals(redis.execute(CONSUME, List.of(key), state))) throw invalid();
        member.resetPassword(passwordHash);
        members.flush();
    }
    private ResponseStatusException invalid() {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, "인증이 만료되었거나 이미 사용됐어요. 인증을 다시 진행해 주세요");
    }
}
