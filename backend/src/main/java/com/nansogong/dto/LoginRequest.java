package com.nansogong.dto;

import jakarta.validation.constraints.NotBlank;

/** 로그인 요청 */
public record LoginRequest(
        @NotBlank String loginId,
        @NotBlank String password,
        Boolean rememberMe
) {
    public LoginRequest { rememberMe = Boolean.TRUE.equals(rememberMe); }
}
