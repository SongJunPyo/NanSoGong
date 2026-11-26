package com.nansogong.controller;

import com.nansogong.dto.LoginRequest;
import com.nansogong.dto.AuthSignupResponse;
import com.nansogong.dto.SignupRequest;
import com.nansogong.dto.TokenResponse;
import com.nansogong.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/** 가입 · 로그인. /api/auth/** 는 토큰 없이 들어올 수 있다 (common/SecurityConfig) */
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/signup")
    @ResponseStatus(HttpStatus.CREATED)
    public AuthSignupResponse signup(@Valid @RequestBody SignupRequest request) {
        return authService.signup(request);
    }

    @GetMapping("/login-id/exists")
    public Map<String, Boolean> loginIdExists(@RequestParam String loginId) {
        return Map.of("exists", authService.isLoginIdTaken(loginId));
    }

    @PostMapping("/login")
    public TokenResponse login(@Valid @RequestBody LoginRequest request) {
        return authService.login(request);
    }
}
