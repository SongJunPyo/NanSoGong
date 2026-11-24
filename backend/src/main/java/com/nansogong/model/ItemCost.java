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

/** 품목 단가 이력 (item_cost 표). 관리 단위 1당 가격. 한 번 쌓으면 고치지 않으므로 updated_at 이 없다. */
@Entity
@Table(name = "item_cost")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ItemCost {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "item_cost_id")
    private Long id;

    @Column(nullable = false)
    private Long storeId;

    @Column(nullable = false)
    private Long itemId;

    @Column(nullable = false, precision = 19, scale = 4)
    private BigDecimal unitCost;

    @Column(nullable = false)
    private Instant effectiveFrom;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ItemCostSource source;

    private Long refId;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    public static ItemCost create(Long storeId, Long itemId, BigDecimal unitCost, Instant effectiveFrom,
                                  ItemCostSource source, Long refId) {
        ItemCost itemCost = new ItemCost();
        itemCost.storeId = storeId;
        itemCost.itemId = itemId;
        itemCost.unitCost = unitCost;
        itemCost.effectiveFrom = effectiveFrom;
        itemCost.source = source;
        itemCost.refId = refId;
        return itemCost;
    }
}
