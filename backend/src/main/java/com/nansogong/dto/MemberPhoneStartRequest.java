package com.nansogong.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record MemberPhoneStartRequest(
        @NotBlank @Size(max = 64) String currentPassword,
        @NotBlank @Pattern(regexp = "^01[016789][0-9]{7,8}$", message = "새 휴대전화 번호를 확인해 주세요") String phone
) {
    public MemberPhoneStartRequest { phone = phone == null ? null : phone.replaceAll("[-\\s]", ""); }
}
