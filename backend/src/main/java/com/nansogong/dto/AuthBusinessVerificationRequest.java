package com.nansogong.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/** 인증키는 서버 설정에서 읽고, 진위확인에 필요한 세 값만 받는다. */
public record AuthBusinessVerificationRequest(
        @NotBlank @Pattern(regexp = "[0-9]{10}") String bizRegNo,
        @NotBlank @Size(max = 50) String ownerName,
        @NotBlank @Pattern(regexp = "[0-9]{8}") String openingDate
) {}
