package com.nansogong.model;

/** 사장님이 직접 등록하는 재고 감소 종류 (UF-11). 장부에는 같은 이름의 InventoryTransactionType 으로 남는다 */
public enum InventoryAdjustmentType {
    DISPOSAL,   // 폐기: 상하거나 유통기한이 지나 버린 것
    LOSS;       // 손실: 쏟음 · 파손 · 분실 등

    public InventoryTransactionType toTransactionType() {
        return switch (this) {
            case DISPOSAL -> InventoryTransactionType.DISPOSAL;
            case LOSS -> InventoryTransactionType.LOSS;
        };
    }
}
