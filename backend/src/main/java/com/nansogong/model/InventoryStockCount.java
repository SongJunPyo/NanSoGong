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
 * 실사 기록 (stock_count 표). 초기 재고(INITIAL)와 실사(COUNT)가 재고 계산의 기준점이 된다.
 * 한 번 쌓으면 고치지 않는 표라 updated_at 이 없다. 수량은 품목의 관리 단위.
 */
@Entity
@Table(name = "stock_count")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class InventoryStockCount {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "stock_count_id")
    private Long id;

    @Column(nullable = false)
    private Long storeId;

    @Column(nullable = false)
    private Long itemId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private InventoryStockCountType countType;

    /** 실사 시점의 추정 재고. 초기 재고면 null */
    @Column(precision = 19, scale = 3)
    private BigDecimal estimatedQty;

    @Column(nullable = false, precision = 19, scale = 3)
    private BigDecimal countedQty;

    /** 기준 일시. 이 시각 이후(초과)의 장부 변동만 재고 계산에 더한다 */
    @Column(nullable = false)
    private Instant countedAt;

    @Column(length = 255)
    private String memo;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    /** 초기 재고. 비교할 추정 재고가 없으므로 estimatedQty 는 비운다 */
    public static InventoryStockCount initial(Long storeId, Long itemId, BigDecimal countedQty, Instant countedAt, String memo) {
        InventoryStockCount stockCount = new InventoryStockCount();
        stockCount.storeId = storeId;
        stockCount.itemId = itemId;
        stockCount.countType = InventoryStockCountType.INITIAL;
        stockCount.countedQty = countedQty;
        stockCount.countedAt = countedAt;
        stockCount.memo = memo;
        return stockCount;
    }
}
