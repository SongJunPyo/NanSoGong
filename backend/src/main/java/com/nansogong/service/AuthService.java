package com.nansogong.service;

import com.nansogong.common.AppProperties;
import com.nansogong.dto.LoginRequest;
import com.nansogong.dto.MemberResponse;
import com.nansogong.dto.SignupRequest;
import com.nansogong.dto.TokenResponse;
import com.nansogong.model.Member;
import com.nansogong.model.MemberStatus;
import com.nansogong.repository.MemberRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Duration;
import java.time.Instant;

/**
 * 가입 · 로그인.
 * TODO: 공용 BusinessException 이 생기면 ResponseStatusException 을 업무 예외로 바꾼다 (AGENTS.md 3-2).
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {

    private final MemberRepository memberRepository;
    private final PasswordEncoder passwordEncoder;   // common/SecurityConfig 의 BCrypt
    private final JwtEncoder jwtEncoder;             // common/SecurityConfig 의 HS256 토큰 생성기
    private final AppProperties props;

    /** 아이디 중복 확인: 이미 있으면 true */
    @Transactional(readOnly = true)
    public boolean isLoginIdTaken(String loginId) {
        return memberRepository.existsByLoginId(loginId);
    }

    /** 가입: 중복 확인 → 비밀번호 해시 → 저장 */
    @Transactional
    public MemberResponse signup(SignupRequest request) {
        if (memberRepository.existsByLoginId(request.loginId())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "이미 사용 중인 아이디입니다");
        }
        String passwordHash = passwordEncoder.encode(request.password());
        Member member = Member.create(request.loginId(), passwordHash, request.name(), request.phone());
        try {
            memberRepository.saveAndFlush(member);
        } catch (DataIntegrityViolationException e) {   // 거의 동시에 같은 아이디로 가입한 경우 (DB 의 UNIQUE 가 막아 준다)
            throw new ResponseStatusException(HttpStatus.CONFLICT, "이미 사용 중인 아이디입니다");
        }
        log.info("회원 가입 memberId={}", member.getId());
        return MemberResponse.from(member);
    }

    /** 로그인: 아이디 찾기 → 비밀번호 비교 → 토큰 발급 */
    @Transactional(readOnly = true)
    public TokenResponse login(LoginRequest request) {
        // 아이디가 없을 때와 비밀번호가 틀릴 때 같은 메시지: 어느 쪽이 틀렸는지 알려 주면 아이디를 알아내는 데 쓰일 수 있다
        Member member = memberRepository.findByLoginId(request.loginId())
                .filter(m -> passwordEncoder.matches(request.password(), m.getPasswordHash()))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "아이디 또는 비밀번호가 올바르지 않습니다"));

        if (member.getStatus() != MemberStatus.ACTIVE) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "이용할 수 없는 계정입니다");
        }

        Duration ttl = props.jwt().accessTokenTtl();
        Instant now = Instant.now();
        JwtClaimsSet claims = JwtClaimsSet.builder()
                .subject(String.valueOf(member.getId()))   // 토큰 주인 = 회원 번호. 컨트롤러에서 jwt.getSubject() 로 꺼낸다
                .issuedAt(now)
                .expiresAt(now.plus(ttl))
                .build();
        JwsHeader header = JwsHeader.with(MacAlgorithm.HS256).build();   // SecurityConfig 의 검증 방식(HS256)과 같아야 한다
        String token = jwtEncoder.encode(JwtEncoderParameters.from(header, claims)).getTokenValue();

        return TokenResponse.bearer(token, ttl.toSeconds());
    }
}
