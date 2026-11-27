package com.nansogong.controller;

import com.nansogong.dto.AuthPhoneChallengeResponse;
import com.nansogong.dto.AuthPasswordResetStartRequest;
import com.nansogong.dto.AuthPasswordResetConfirmationRequest;
import com.nansogong.dto.AuthPasswordResetProofResponse;
import com.nansogong.dto.AuthPasswordResetCompletionRequest;
import com.nansogong.service.AuthPasswordResetService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import java.util.UUID;

@RestController
@RequestMapping("/api/auth/password-resets")
@RequiredArgsConstructor
public class AuthPasswordResetController {
    private final AuthPasswordResetService service;
    @PostMapping
    public AuthPhoneChallengeResponse request(@Valid @RequestBody AuthPasswordResetStartRequest request, HttpServletRequest servletRequest) {
        return service.request(request, servletRequest.getRemoteAddr());
    }
    @PostMapping("/{challengeId}/confirmations")
    public AuthPasswordResetProofResponse confirm(@PathVariable UUID challengeId, @Valid @RequestBody AuthPasswordResetConfirmationRequest request) {
        return service.confirm(challengeId, request);
    }
    @PostMapping("/completions")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void complete(@Valid @RequestBody AuthPasswordResetCompletionRequest request) { service.complete(request); }
}
