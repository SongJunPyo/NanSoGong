package com.nansogong.controller;

import com.nansogong.dto.MemberResponse;
import com.nansogong.dto.MemberPhoneStartRequest;
import com.nansogong.dto.MemberPhoneConfirmationRequest;
import com.nansogong.dto.MemberPhoneUpdateRequest;
import com.nansogong.dto.MemberPhoneProofResponse;
import com.nansogong.dto.AuthPhoneChallengeResponse;
import com.nansogong.service.MemberPhoneChangeService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PathVariable;
import java.util.UUID;
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
    private final MemberPhoneChangeService phones;

    @GetMapping("/me")
    public MemberResponse me(@AuthenticationPrincipal Jwt jwt) {
        return memberService.getMe(Long.valueOf(jwt.getSubject()));   // 토큰의 subject = 회원 번호
    }

    @PatchMapping("/me")
    public MemberResponse update(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody MemberUpdateRequest request) {
        return memberService.updateMe(Long.valueOf(jwt.getSubject()), jwt.getClaimAsString("credentialVersion"), request);
    }
    @PostMapping("/me/phone-verifications")
    public AuthPhoneChallengeResponse requestPhone(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody MemberPhoneStartRequest request, HttpServletRequest http) {
        return phones.request(Long.valueOf(jwt.getSubject()), jwt.getClaimAsString("credentialVersion"), request, http.getRemoteAddr());
    }
    @PostMapping("/me/phone-verifications/{challengeId}/confirmations")
    public MemberPhoneProofResponse confirmPhone(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID challengeId, @Valid @RequestBody MemberPhoneConfirmationRequest request) {
        return phones.confirm(Long.valueOf(jwt.getSubject()), jwt.getClaimAsString("credentialVersion"), challengeId, request);
    }
    @PatchMapping("/me/phone")
    public MemberResponse updatePhone(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody MemberPhoneUpdateRequest request) {
        return phones.complete(Long.valueOf(jwt.getSubject()), jwt.getClaimAsString("credentialVersion"), request);
    }

}
