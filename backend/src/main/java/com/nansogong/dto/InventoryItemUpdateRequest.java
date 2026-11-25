package com.nansogong.dto;

import com.nansogong.model.ItemType;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

/**
 * 품목 수정 요청. 보낸 값으로 통째로 바꾼다 (PUT): 비운 칸은 지워진다.
 * 관리 단위(unit)는 바꿀 수 없어서 칸이 없다. 요청에 unit 을 넣어도 무시된다.
 */
public record InventoryItemUpdateRequest(
        @NotBlank @Size(max = 100) String name,
        @NotNull ItemType itemType,
        @Size(max = 50) String category,
        @Size(max = 10) String purchaseUnit,
        @Positive @Digits(integer = 16, fraction = 3) BigDecimal packSize
) {}
