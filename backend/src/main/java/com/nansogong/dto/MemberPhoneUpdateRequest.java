package com.nansogong.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record MemberPhoneUpdateRequest(
        @NotBlank @Pattern(regexp = "^01[016789][0-9]{7,8}$") String phone,
        @NotBlank @Size(max = 200) String verificationToken
) {
    public MemberPhoneUpdateRequest { phone = phone == null ? null : phone.replaceAll("[-\\s]", ""); }
}
