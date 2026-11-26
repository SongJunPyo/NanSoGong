package com.nansogong.controller;

import com.nansogong.dto.AuthPhoneChallengeResponse;
import com.nansogong.dto.AuthPhoneConfirmationRequest;
import com.nansogong.dto.AuthPhoneConfirmationResponse;
import com.nansogong.dto.AuthPhoneRequest;
import com.nansogong.service.AuthPhoneVerificationService;
import jakarta.validation.Valid;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

/** MVP의 개발용 인증번호를 검증한다. 실제 SMS 본인인증 API가 아니다. */
@RestController
@RequestMapping("/api/auth/phone-verifications")
@RequiredArgsConstructor
public class AuthPhoneVerificationController {
    private final AuthPhoneVerificationService phoneService;

    @PostMapping
    public AuthPhoneChallengeResponse requestCode(@Valid @RequestBody AuthPhoneRequest request, HttpServletRequest http) {
        return phoneService.requestCode(request, http.getRemoteAddr());
    }

    @PostMapping("/{challengeId}/confirmations")
    public AuthPhoneConfirmationResponse confirm(@PathVariable UUID challengeId, @Valid @RequestBody AuthPhoneConfirmationRequest request) {
        return phoneService.confirm(challengeId, request);
    }
}
