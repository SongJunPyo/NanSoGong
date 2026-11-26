package com.nansogong.model;

/** 재고 장부 변동 종류 (inventory_transaction.txn_type). 입고 · 환원은 qty_delta 양수, 나머지는 음수 */
public enum InventoryTransactionType {
    SALE,       // 판매 차감
    CANCEL,     // 취소 환원
    RECEIPT,    // 입고
    DISPOSAL,   // 폐기
    LOSS        // 손실
}
