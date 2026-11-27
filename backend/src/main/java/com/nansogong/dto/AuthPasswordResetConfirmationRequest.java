package com.nansogong.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record AuthPasswordResetConfirmationRequest(
        @NotBlank @Size(max = 50) String loginId,
        @NotBlank @Pattern(regexp = "01[016789][0-9]{7,8}", message = "휴대전화 번호를 확인해 주세요") String phone,
        @NotBlank @Pattern(regexp = "[0-9]{6}", message = "인증번호 6자리를 입력해 주세요") String code
) {
    public AuthPasswordResetConfirmationRequest {
        loginId = loginId == null ? null : loginId.strip();
        phone = phone == null ? null : phone.replaceAll("[-\\s]", "");
    }
}
