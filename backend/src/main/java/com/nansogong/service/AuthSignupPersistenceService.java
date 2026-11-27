package com.nansogong.service;

import com.nansogong.dto.AuthSignupResponse;
import com.nansogong.dto.SignupRequest;
import com.nansogong.model.Member;
import com.nansogong.repository.MemberRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;

/** 외부 검증을 끝낸 뒤 회원·매장 DB 변경만 하나의 트랜잭션으로 묶는다. */
@Service
@RequiredArgsConstructor
public class AuthSignupPersistenceService {
    private final MemberRepository memberRepository;
    private final StoreService storeService;

    @Transactional
    public AuthSignupResponse create(SignupRequest request, String passwordHash, Instant phoneVerifiedAt) {
        memberRepository.lockRegistration(request.loginId());
        if (memberRepository.existsByLoginId(request.loginId())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "이미 사용 중인 아이디입니다");
        }
        Member member = memberRepository.saveAndFlush(Member.create(request.loginId(), passwordHash, request.name(), request.phone(), phoneVerifiedAt));
        storeService.registerVerified(member.getId(), request.stores());
        return new AuthSignupResponse(member.getId(), member.getLoginId(), request.stores().size());
    }
}
