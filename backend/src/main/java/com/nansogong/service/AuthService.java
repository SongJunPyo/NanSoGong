package com.nansogong.service;

import com.nansogong.common.AppProperties;
import com.nansogong.dto.LoginRequest;
import com.nansogong.dto.AuthSignupResponse;
import com.nansogong.dto.AuthBusinessVerificationRequest;
import com.nansogong.dto.AuthBusinessVerificationResponse;
import com.nansogong.dto.SignupRequest;
import com.nansogong.dto.TokenResponse;
import com.nansogong.model.MemberStatus;
import com.nansogong.model.Member;
import com.nansogong.repository.MemberRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.dao.DataAccessException;
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
import java.nio.charset.StandardCharsets;
import java.util.HashSet;

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
    private final AuthPhoneVerificationService phoneService;
    private final AuthBusinessVerificationService businessVerificationService;
    private final AuthSignupPersistenceService signupPersistenceService;
    private final StoreService storeService;

    /** 아이디 중복 확인: 이미 있으면 true */
    @Transactional(readOnly = true)
    public boolean isLoginIdTaken(String loginId) {
        return memberRepository.existsByLoginId(loginId);
    }

    /** 외부 확인 중에는 DB 트랜잭션을 열지 않는다. 프론트 확인 결과·토큰은 사업자 검증에 사용하지 않는다. */
    public AuthSignupResponse signup(SignupRequest request) {
        var proof = phoneService.requireProof(request.phoneVerificationToken(), request.name(), request.phone());
        if (memberRepository.existsByLoginId(request.loginId())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "이미 사용 중인 아이디입니다");
        }
        if (request.password().getBytes(StandardCharsets.UTF_8).length > 72) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "비밀번호가 너무 길어요. 영문·숫자·기호로 줄여 주세요");
        }
        if (new HashSet<>(request.stores().stream().map(store -> store.bizRegNo()).toList()).size() != request.stores().size()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "같은 사업자등록번호를 두 번 등록할 수 없어요");
        }
        storeService.checkRegistrationNumbers(request.stores());
        var results = businessVerificationService.verifyAll(request.stores().stream()
                .map(store -> new AuthBusinessVerificationRequest(store.bizRegNo(), store.ownerName(), store.openingDate())).toList());
        if (results.stream().anyMatch(result -> result.status() != AuthBusinessVerificationResponse.Status.ACTIVE)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "사업자정보가 일치하고 영업 중인 사업자만 등록할 수 있어요. 등록 목록을 다시 확인해 주세요");
        }
        String passwordHash = passwordEncoder.encode(request.password());
        var claim = phoneService.claim(proof);
        try {
            AuthSignupResponse created = signupPersistenceService.create(request, passwordHash, proof.verifiedAt());
            log.info("회원 가입 memberId={}", created.memberId());
            return created;
        } catch (RuntimeException e) {
            try { phoneService.restore(claim); }
            catch (DataAccessException restoreFailure) { log.warn("회원가입 실패 후 휴대전화 인증 증명 복구 실패"); }
            if (e instanceof DataIntegrityViolationException) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "이미 등록된 가입 정보가 있어요. 아이디와 사업자번호를 확인해 주세요");
            }
            throw e;
        }
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
