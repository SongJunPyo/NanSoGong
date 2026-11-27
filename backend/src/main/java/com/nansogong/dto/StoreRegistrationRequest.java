package com.nansogong.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record StoreRegistrationRequest(
        @NotBlank @Pattern(regexp = "[0-9]{10}", message = "사업자등록번호는 숫자 10자리로 입력해 주세요") String bizRegNo,
        @NotBlank(message = "대표자명을 입력해 주세요") @Size(max = 50) String ownerName,
        @NotBlank @Pattern(regexp = "[0-9]{8}", message = "개업일자는 YYYYMMDD로 입력해 주세요") String openingDate,
        @Size(max = 100, message = "상호는 100자 이내로 입력해 주세요") String bizName
) {
    public StoreRegistrationRequest {
        ownerName = ownerName == null ? null : ownerName.strip();
        bizName = bizName == null ? null : bizName.strip();
    }
}
