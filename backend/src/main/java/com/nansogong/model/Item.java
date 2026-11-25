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
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.Instant;

/**
 * 재고 품목 (item 표). 원재료 · 포장재.
 * 지금은 품목 등록 · 수정에 필요한 칸만 매핑했다. 아래 칸은 쓰는 기능을 만들 때 추가한다.
 * - unit_cost: item_cost 단가 이력의 최신값 사본이라 이력과 함께 다룬다
 * - default_supplier_id · purchase_config: 거래처 · 발주 기능과 함께
 * - reorder_point · target_qty · policy_basis: 에이전트가 산정하는 운영 기준 (구현-3-3). 사용자 입력으로 받지 않는다
 * 삭제하지 않고 비활성으로 바꾼다: 재고 장부 · 실사 · 레시피가 item_id 를 참조한다.
 * 관리 단위(unit)는 등록 후 바꾸지 않는다: 이미 쌓인 레시피 · 재고 수량의 의미가 달라진다.
 */
@Entity
@Table(name = "item")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Item {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "item_id")
    private Long id;

    @Column(nullable = false)
    private Long storeId;

    @Column(nullable = false, length = 100)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ItemType itemType;

    @Column(length = 50)
    private String category;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private ItemUnit unit;

    @Column(length = 10)
    private String purchaseUnit;

    @Column(precision = 19, scale = 3)
    private BigDecimal packSize;

    @Column(name = "is_active", nullable = false)
    private boolean active;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(nullable = false)
    private Instant updatedAt;

    /** 품목 등록. 처음에는 사용 중 상태다 */
    public static Item create(Long storeId, String name, ItemType itemType, String category, ItemUnit unit,
                              String purchaseUnit, BigDecimal packSize) {
        Item item = new Item();
        item.storeId = storeId;
        item.name = name.strip();
        item.itemType = itemType;
        item.category = category;
        item.unit = unit;
        item.purchaseUnit = purchaseUnit;
        item.packSize = packSize;
        item.active = true;
        return item;
    }

    /** 품목 정보 수정. 관리 단위(unit)는 바꿀 수 없어서 받지 않는다 */
    public void update(String name, ItemType itemType, String category, String purchaseUnit, BigDecimal packSize) {
        this.name = name.strip();
        this.itemType = itemType;
        this.category = category;
        this.purchaseUnit = purchaseUnit;
        this.packSize = packSize;
    }

    /** 사용 중지. 이미 중지된 품목이면 아무것도 바뀌지 않는다 */
    public void deactivate() {
        this.active = false;
    }
}
