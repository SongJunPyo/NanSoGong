package com.nansogong.service;

import com.nansogong.dto.MemberResponse;
import com.nansogong.dto.MemberUpdateRequest;
import com.nansogong.model.MemberStatus;
import com.nansogong.repository.MemberRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.nio.charset.StandardCharsets;

@Service
@RequiredArgsConstructor
public class MemberService {

    private final MemberRepository memberRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthCredentialService credentialService;

    /** 내 정보 (토큰의 회원 번호로 찾는다) */
    @Transactional(readOnly = true)
    public MemberResponse getMe(Long memberId) {
        return memberRepository.findById(memberId)
                .map(MemberResponse::from)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "회원을 찾을 수 없습니다"));
    }

    /** 이름·비밀번호는 함께 저장한다. 비밀번호 재설정과 같은 행 잠금으로 덮어쓰기를 막는다. */
    @Transactional
    public MemberResponse updateMe(Long memberId, String credentialVersion, MemberUpdateRequest request) {
        var member = memberRepository.findForPasswordReset(memberId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "회원을 찾을 수 없습니다"));
        // JWT 필터를 통과한 후 잠금을 기다리는 사이 자격이 바뀐 요청도 거절한다.
        if (member.getStatus() != MemberStatus.ACTIVE
                || !credentialService.matches(credentialService.version(member), credentialVersion)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "다시 로그인해 주세요");
        }
        if (request.changesPassword()) {
            if (request.currentPassword() == null || request.currentPassword().isEmpty()
                    || request.password() == null || request.password().isEmpty()
                    || request.passwordConfirm() == null || !request.password().equals(request.passwordConfirm())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "현재 비밀번호와 새 비밀번호·확인을 모두 입력해 주세요");
            }
            if (request.currentPassword().getBytes(StandardCharsets.UTF_8).length > 72
                    || !passwordEncoder.matches(request.currentPassword(), member.getPasswordHash())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "현재 비밀번호가 올바르지 않아요");
            }
            if (request.password().getBytes(StandardCharsets.UTF_8).length > 72) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "비밀번호가 너무 길어요. 영문·숫자·기호로 줄여 주세요");
            }
            member.resetPassword(passwordEncoder.encode(request.password()));
        }
        member.changeName(request.name());
        memberRepository.flush();
        return MemberResponse.from(member);
    }
}
