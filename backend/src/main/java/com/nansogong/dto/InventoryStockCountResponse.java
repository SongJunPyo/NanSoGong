package com.nansogong.dto;

import com.nansogong.model.InventoryStockCount;
import com.nansogong.model.InventoryStockCountType;

import java.math.BigDecimal;
import java.time.Instant;

/** 실사 기록 응답 (초기 재고 포함) */
public record InventoryStockCountResponse(
        Long id,
        Long itemId,
        InventoryStockCountType countType,
        BigDecimal estimatedQty,
        BigDecimal countedQty,
        Instant countedAt,
        String memo,
        Instant createdAt
) {
    public static InventoryStockCountResponse from(InventoryStockCount stockCount) {
        return new InventoryStockCountResponse(stockCount.getId(), stockCount.getItemId(), stockCount.getCountType(),
                stockCount.getEstimatedQty(), stockCount.getCountedQty(), stockCount.getCountedAt(),
                stockCount.getMemo(), stockCount.getCreatedAt());
    }
}
