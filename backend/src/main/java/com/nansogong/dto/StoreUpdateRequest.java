package com.nansogong.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.util.List;

public record StoreUpdateRequest(
        @NotBlank(message = "매장명을 입력해 주세요") @Size(max = 100) String name,
        @NotBlank(message = "업종을 입력해 주세요") @Size(max = 50) String category,
        @NotBlank(message = "주소를 입력해 주세요") @Size(max = 255) String address,
        @Pattern(regexp = "|(?:[01][0-9]|2[0-3]):[0-5][0-9]", message = "영업시간을 HH:mm 형식으로 입력해 주세요") String openTime,
        @Pattern(regexp = "|(?:[01][0-9]|2[0-3]):[0-5][0-9]", message = "영업시간을 HH:mm 형식으로 입력해 주세요") String closeTime,
        @Size(max = 7) List<@NotNull @Pattern(regexp = "mon|tue|wed|thu|fri|sat|sun") String> closedDays
) {
    public StoreUpdateRequest {
        name = name == null ? null : name.strip();
        category = category == null ? null : category.strip();
        address = address == null ? null : address.strip();
        openTime = openTime == null ? "" : openTime;
        closeTime = closeTime == null ? "" : closeTime;
        closedDays = closedDays == null ? List.of() : closedDays;
    }
}
