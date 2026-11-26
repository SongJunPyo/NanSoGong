package com.nansogong.dto;

import com.nansogong.model.InventoryStockCount;
import com.nansogong.model.InventoryStockCountType;
import com.nansogong.model.ItemUnit;

import java.math.BigDecimal;
import java.time.Instant;

/**
 * 품목의 현재 추정 재고 (구현-3-4, 3-5). 실제로 센 수량이 아니라 계산한 값이다: 화면에 '추정' 과 기준 시각을 함께 보여 준다.
 * 추정 재고 = 기준 수량(baseQty) + 기준 시각 이후 변동량(changeSinceBase).
 * 기준점(초기 재고 · 실사)이 없으면 initialized = false 이고 수량 칸은 모두 null 이다 (0 으로 채우지 않는다).
 */
public record InventoryStockResponse(
        Long itemId,
        ItemUnit unit,
        boolean initialized,
        BigDecimal estimatedQty,
        InventoryStockCountType baseType,
        BigDecimal baseQty,
        Instant baseAt,
        BigDecimal changeSinceBase,
        Instant calculatedAt
) {
    /** 기준점이 있을 때. changeSinceBase 는 기준 이후 변동이 없으면 0 */
    public static InventoryStockResponse of(Long itemId, ItemUnit unit, InventoryStockCount base,
                                            BigDecimal changeSinceBase, Instant calculatedAt) {
        return new InventoryStockResponse(itemId, unit, true, base.getCountedQty().add(changeSinceBase),
                base.getCountType(), base.getCountedQty(), base.getCountedAt(), changeSinceBase, calculatedAt);
    }

    /** 초기 재고를 아직 입력하지 않았을 때 */
    public static InventoryStockResponse notInitialized(Long itemId, ItemUnit unit, Instant calculatedAt) {
        return new InventoryStockResponse(itemId, unit, false, null, null, null, null, null, calculatedAt);
    }
}
