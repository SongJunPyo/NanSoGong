package com.nansogong.dto;

import com.nansogong.model.InventoryItem;
import com.nansogong.model.ItemType;
import com.nansogong.model.ItemUnit;

/** 다른 도메인(레시피 등)에 넘겨 주는 품목 정보. Entity 를 직접 넘기지 않는다 (AGENTS.md 3-2) */
public record InventoryItemResponse(
        Long id,
        Long storeId,
        String name,
        ItemType itemType,
        ItemUnit unit,
        boolean active
) {
    public static InventoryItemResponse from(InventoryItem item) {
        return new InventoryItemResponse(item.getId(), item.getStoreId(), item.getName(), item.getItemType(), item.getUnit(), item.isActive());
    }
}
