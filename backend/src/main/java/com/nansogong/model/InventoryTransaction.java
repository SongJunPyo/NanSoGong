package com.nansogong.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.Instant;

/**
 * 재고 변동 장부 (inventory_transaction 표). 추가만 하고 고치지 않는다: 취소도 기존 행을 고치지 않고 환원 행을 추가한다.
 * 재고 계산은 발생 시각(occurredAt) 기준이다. 반영 시각(recordedAt)은 언제 들어왔는지 기록용.
 * 중복 방지: (idempotency_key, item_id) UNIQUE. 키 모양은 docs/rules/domain.md 판매 → 재고 차감.
 */
@Entity
@Table(name = "inventory_transaction")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class InventoryTransaction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "inventory_transaction_id")
    private Long id;

    @Column(nullable = false)
    private Long storeId;

    @Column(nullable = false)
    private Long itemId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private InventoryTransactionType txnType;

    /** 관리 단위 증감량. 입고 · 환원은 양수, 차감 · 폐기 · 손실은 음수 */
    @Column(nullable = false, precision = 19, scale = 3)
    private BigDecimal qtyDelta;

    /** 발생 시점 단가 사본 (관리 단위 1당) */
    @Column(precision = 19, scale = 4)
    private BigDecimal unitCost;

    private Long salesOrderItemId;

    private Long receiptItemId;

    private Long reversedInventoryTransactionId;

    @Column(nullable = false)
    private Instant occurredAt;

    @Column(nullable = false)
    private Instant recordedAt;

    @Column(nullable = false, length = 100)
    private String idempotencyKey;

    @Column(length = 255)
    private String memo;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    /**
     * 근거 행(판매 항목 · 입고 확인)이 없는 변동 기록 (폐기 · 손실 등). 반영 시각은 지금.
     * 판매 차감 · 입고처럼 근거 행이 있는 변동은 그 기능을 만들 때 전용 생성 메서드를 추가한다.
     */
    public static InventoryTransaction record(Long storeId, Long itemId, InventoryTransactionType txnType,
                                              BigDecimal qtyDelta, Instant occurredAt, String idempotencyKey, String memo) {
        InventoryTransaction txn = new InventoryTransaction();
        txn.storeId = storeId;
        txn.itemId = itemId;
        txn.txnType = txnType;
        txn.qtyDelta = qtyDelta;
        txn.occurredAt = occurredAt;
        txn.recordedAt = Instant.now();
        txn.idempotencyKey = idempotencyKey;
        txn.memo = memo;
        return txn;
    }
}
