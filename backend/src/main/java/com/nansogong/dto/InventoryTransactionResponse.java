package com.nansogong.dto;

import com.nansogong.model.InventoryTransaction;
import com.nansogong.model.InventoryTransactionType;

import java.math.BigDecimal;
import java.time.Instant;

/** 재고 장부 한 줄 응답. qtyDelta 는 증감량 (폐기 · 손실이면 음수) */
public record InventoryTransactionResponse(
        Long id,
        Long itemId,
        InventoryTransactionType txnType,
        BigDecimal qtyDelta,
        Instant occurredAt,
        Instant recordedAt,
        String memo
) {
    public static InventoryTransactionResponse from(InventoryTransaction txn) {
        return new InventoryTransactionResponse(txn.getId(), txn.getItemId(), txn.getTxnType(), txn.getQtyDelta(),
                txn.getOccurredAt(), txn.getRecordedAt(), txn.getMemo());
    }
}
