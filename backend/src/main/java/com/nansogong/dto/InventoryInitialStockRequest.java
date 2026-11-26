package com.nansogong.dto;

import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

/**
 * 초기 재고 입력 요청 (구현-3-2). 수량은 품목의 관리 단위, 0 이상, 소수 셋째 자리까지 (DECIMAL(19,3)).
 * countedAt 은 재고 계산 시작 시각. offset 이 붙은 ISO 8601 로 받는다 (예: 2026-11-20T09:00:00+09:00). 미래 시각은 안 된다.
 */
public record InventoryInitialStockRequest(
        @NotNull @PositiveOrZero @Digits(integer = 16, fraction = 3) BigDecimal countedQty,
        @NotNull OffsetDateTime countedAt,
        @Size(max = 255) String memo
) {}
