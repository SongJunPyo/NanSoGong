package com.nansogong.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record AuthPhoneConfirmationRequest(
        @NotBlank @Size(max = 50) String name,
        @NotBlank @Pattern(regexp = "01[016789][0-9]{7,8}") String phone,
        @NotBlank @Pattern(regexp = "[0-9]{6}", message = "인증번호는 숫자 6자리로 입력해 주세요") String code
) {
    public AuthPhoneConfirmationRequest {
        name = name == null ? null : name.strip();
        phone = phone == null ? null : phone.replaceAll("[-\\s]", "");
    }
}
