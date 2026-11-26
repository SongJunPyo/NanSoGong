package com.nansogong.dto;

import com.nansogong.model.InventoryItem;
import com.nansogong.model.ItemType;
import com.nansogong.model.ItemUnit;

import java.math.BigDecimal;
import java.time.Instant;

/** 품목 응답. Entity 를 그대로 내보내지 않는다 */
public record InventoryItemResponse(
        Long id,
        String name,
        ItemType itemType,
        String category,
        ItemUnit unit,
        String purchaseUnit,
        BigDecimal packSize,
        boolean active,
        Instant createdAt,
        Instant updatedAt
) {
    public static InventoryItemResponse from(InventoryItem item) {
        return new InventoryItemResponse(item.getId(), item.getName(), item.getItemType(), item.getCategory(),
                item.getUnit(), item.getPurchaseUnit(), item.getPackSize(), item.isActive(),
                item.getCreatedAt(), item.getUpdatedAt());
    }
}
