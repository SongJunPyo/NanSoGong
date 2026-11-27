package com.nansogong.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record AuthPasswordResetStartRequest(
        @NotBlank @Size(max = 50) String loginId,
        @NotBlank @Pattern(regexp = "01[016789][0-9]{7,8}", message = "휴대전화 번호를 확인해 주세요") String phone
) {
    public AuthPasswordResetStartRequest {
        loginId = loginId == null ? null : loginId.strip();
        phone = phone == null ? null : phone.replaceAll("[-\\s]", "");
    }
}
