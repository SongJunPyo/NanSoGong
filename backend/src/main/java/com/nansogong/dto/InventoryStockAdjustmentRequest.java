package com.nansogong.dto;

import com.nansogong.model.InventoryAdjustmentType;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

/**
 * 폐기 · 손실 등록 요청 (구현-3-6, UF-11 3B).
 * qty 는 줄어든 양을 양수로 받는다 (관리 단위, 소수 셋째 자리까지). 장부에는 음수로 기록한다.
 * occurredAt 은 실제로 버리거나 잃어버린 시각. offset 이 붙은 ISO 8601. 미래 시각은 안 된다.
 */
public record InventoryStockAdjustmentRequest(
        @NotNull InventoryAdjustmentType type,
        @NotNull @Positive @Digits(integer = 16, fraction = 3) BigDecimal qty,
        @NotNull OffsetDateTime occurredAt,
        @Size(max = 255) String memo
) {}
