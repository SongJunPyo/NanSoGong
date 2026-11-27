package com.nansogong.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

/** 상태조회에는 사업자번호만 필요하다. 인증키는 서버 설정에서 읽는다. */
public record AuthBusinessStatusRequest(
        @NotBlank
        @Pattern(regexp = "[0-9]{10}", message = "사업자등록번호는 숫자 10자리로 입력해 주세요")
        String bizRegNo
) {}
