package com.nansogong.dto;

import com.nansogong.model.InventoryStockCount;
import com.nansogong.model.InventoryStockCountType;

import java.math.BigDecimal;
import java.time.Instant;

/**
 * 실사 기록 응답 (초기 재고 포함).
 * difference = 실제 수량 − 그 시각 추정 재고. 음수면 기록보다 덜 있었다 (덜 쓴 줄 알았다). 초기 재고면 null.
 */
public record InventoryStockCountResponse(
        Long id,
        Long itemId,
        InventoryStockCountType countType,
        BigDecimal estimatedQty,
        BigDecimal countedQty,
        BigDecimal difference,
        Instant countedAt,
        String memo,
        Instant createdAt
) {
    public static InventoryStockCountResponse from(InventoryStockCount stockCount) {
        BigDecimal estimated = stockCount.getEstimatedQty();
        BigDecimal difference = estimated == null ? null : stockCount.getCountedQty().subtract(estimated);
        return new InventoryStockCountResponse(stockCount.getId(), stockCount.getItemId(), stockCount.getCountType(),
                estimated, stockCount.getCountedQty(), difference, stockCount.getCountedAt(),
                stockCount.getMemo(), stockCount.getCreatedAt());
    }
}
