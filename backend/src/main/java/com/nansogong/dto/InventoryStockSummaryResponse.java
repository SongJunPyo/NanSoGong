package com.nansogong.dto;

import com.nansogong.model.InventoryItem;
import com.nansogong.model.InventoryStockCount;
import com.nansogong.model.InventoryStockCountType;
import com.nansogong.model.InventoryStockStatus;
import com.nansogong.model.ItemType;
import com.nansogong.model.ItemUnit;

import java.math.BigDecimal;
import java.time.Instant;

/**
 * 재고 현황 목록의 품목 한 줄 (구현-3-4, UF-10).
 * estimatedQty 는 실제로 센 수량이 아니라 계산한 값이다: 화면에 '추정' 과 baseAt(최근 실사 · 초기 재고 시각)을 함께 보여 준다.
 * lastChangedAt = 마지막 장부 변동(판매 · 폐기 · 입고 등)이 일어난 시각. 변동이 없으면 null.
 */
public record InventoryStockSummaryResponse(
        Long itemId,
        String name,
        ItemType itemType,
        String category,
        ItemUnit unit,
        String purchaseUnit,
        BigDecimal packSize,
        boolean active,
        InventoryStockStatus status,
        BigDecimal estimatedQty,
        BigDecimal reorderPoint,
        InventoryStockCountType baseType,
        Instant baseAt,
        Instant lastChangedAt
) {
    /**
     * @param base            asOf 시각의 가장 최근 기준점 (없으면 null)
     * @param changeSinceBase 기준 이후 변동 합 (기준점이 없으면 무시)
     */
    public static InventoryStockSummaryResponse of(InventoryItem item, InventoryStockCount base, BigDecimal changeSinceBase,
                                                   Instant lastChangedAt) {
        BigDecimal estimated = base == null ? null : base.getCountedQty().add(changeSinceBase);
        return new InventoryStockSummaryResponse(item.getId(), item.getName(), item.getItemType(), item.getCategory(),
                item.getUnit(), item.getPurchaseUnit(), item.getPackSize(), item.isActive(),
                InventoryStockStatus.of(estimated, item.getReorderPoint()), estimated, item.getReorderPoint(),
                base == null ? null : base.getCountType(), base == null ? null : base.getCountedAt(), lastChangedAt);
    }
}
