package com.nansogong.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record MemberPhoneConfirmationRequest(
        @NotBlank @Pattern(regexp = "^01[016789][0-9]{7,8}$") String phone,
        @NotBlank @Pattern(regexp = "^[0-9]{6}$", message = "인증번호 6자리를 입력해 주세요") String code
) {
    public MemberPhoneConfirmationRequest { phone = phone == null ? null : phone.replaceAll("[-\\s]", ""); }
}
