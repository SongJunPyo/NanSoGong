package com.nansogong.controller;

import com.nansogong.dto.LoginRequest;
import com.nansogong.dto.AuthSignupResponse;
import com.nansogong.dto.SignupRequest;
import com.nansogong.dto.TokenResponse;
import com.nansogong.service.AuthService;
import com.nansogong.service.AuthSessionService;
import com.nansogong.service.AuthCookieService;
import com.nansogong.service.AuthSmsDeliveryService;
import com.nansogong.common.AppProperties;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.Parameters;
import io.swagger.v3.oas.annotations.enums.ParameterIn;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.security.SecurityRequirements;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.web.server.ResponseStatusException;
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
@SecurityRequirements
public class AuthController {

    private final AuthService authService;
    private final AuthSessionService sessions;
    private final AuthCookieService cookies;
    private final AuthSmsDeliveryService sms;
    private final AppProperties props;

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
    @Parameter(name = "X-Nansogong-Auth", in = ParameterIn.HEADER, required = true,
            description = "로그인 CSRF 방어용 필수 헤더",
            schema = @Schema(type = "string", allowableValues = {"1"}, defaultValue = "1"))
    public TokenResponse login(@Valid @RequestBody LoginRequest request, HttpServletResponse response) {
        var session = authService.login(request);
        cookies.write(response, session);
        return session.access();
    }

    @GetMapping("/csrf")
    public Map<String, String> csrf(HttpServletRequest request, HttpServletResponse response) {
        cookies.noStore(response);
        try { return Map.of("csrfToken", sessions.csrfToken(cookies.read(request))); }
        catch (ResponseStatusException failure) { cookies.clear(response); throw failure; }
    }

    @PostMapping("/refresh")
    @Parameters({
            @Parameter(name = "X-Nansogong-Auth", in = ParameterIn.HEADER, required = true,
                    schema = @Schema(type = "string", allowableValues = {"1"}, defaultValue = "1")),
            @Parameter(name = "X-CSRF-Token", in = ParameterIn.HEADER, required = true,
                    description = "같은 Refresh 쿠키로 GET /api/auth/csrf에서 방금 조회한 csrfToken")
    })
    public TokenResponse refresh(HttpServletRequest request, HttpServletResponse response) {
        try {
            var session = sessions.refresh(cookies.read(request));
            cookies.write(response, session);
            return session.access();
        } catch (ResponseStatusException failure) { cookies.clear(response); throw failure; }
    }

    @PostMapping("/logout")
    @Parameters({
            @Parameter(name = "X-Nansogong-Auth", in = ParameterIn.HEADER, required = true,
                    schema = @Schema(type = "string", allowableValues = {"1"}, defaultValue = "1")),
            @Parameter(name = "X-CSRF-Token", in = ParameterIn.HEADER, required = true,
                    description = "같은 Refresh 쿠키로 GET /api/auth/csrf에서 방금 조회한 csrfToken")
    })
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void logout(HttpServletRequest request, HttpServletResponse response) {
        sessions.logout(cookies.read(request));
        cookies.clear(response);
    }

    @GetMapping("/capabilities")
    public Map<String, Object> capabilities(HttpServletResponse response) {
        cookies.noStore(response);
        return Map.of("verificationMode", props.verification().mode().name(), "smsReady", sms.available(),
                "phoneChangeAvailable", sms.available(), "withdrawalAvailable", false,
                "withdrawalReason", "탈퇴 및 데이터 보존 정책을 확인 중이에요.");
    }
}
