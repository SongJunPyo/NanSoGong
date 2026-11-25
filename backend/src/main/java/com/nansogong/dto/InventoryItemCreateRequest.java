package com.nansogong.dto;

import com.nansogong.model.ItemType;
import com.nansogong.model.ItemUnit;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

/**
 * 품목 등록 요청 (구현-3-1). 품목명 · 종류 · 관리 단위는 필수, 나머지는 모르면 비워 둔다.
 * packSize = 구매 단위 1개가 관리 단위로 얼마인지 (원두 1봉 = 1000 G). 소수 셋째 자리까지 (DECIMAL(19,3)).
 */
public record InventoryItemCreateRequest(
        @NotBlank @Size(max = 100) String name,
        @NotNull ItemType itemType,
        @Size(max = 50) String category,
        @NotNull ItemUnit unit,
        @Size(max = 10) String purchaseUnit,
        @Positive @Digits(integer = 16, fraction = 3) BigDecimal packSize
) {}
