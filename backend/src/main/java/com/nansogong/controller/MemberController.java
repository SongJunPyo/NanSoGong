package com.nansogong.controller;

import com.nansogong.dto.MemberResponse;
import com.nansogong.dto.MemberUpdateRequest;
import com.nansogong.service.MemberService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** 내 정보. 토큰이 있어야 들어올 수 있다 */
@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class MemberController {

    private final MemberService memberService;

    @GetMapping("/me")
    public MemberResponse me(@AuthenticationPrincipal Jwt jwt) {
        return memberService.getMe(Long.valueOf(jwt.getSubject()));   // 토큰의 subject = 회원 번호
    }

    @PatchMapping("/me")
    public MemberResponse update(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody MemberUpdateRequest request) {
        return memberService.updateMe(Long.valueOf(jwt.getSubject()), jwt.getClaimAsString("credentialVersion"), request);
    }
}
