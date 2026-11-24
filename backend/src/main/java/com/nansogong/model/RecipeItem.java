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
 * 메뉴 1개(또는 옵션 1개)에 들어가는 품목과 양 (recipe_item 표).
 * 옵션의 quantity 는 기본 메뉴 대비 증감량. 레시피를 바꿀 때는 기존 행의 valid_to 를 닫고 새 행을 추가한다.
 */
@Entity
@Table(name = "recipe_item")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class RecipeItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "recipe_item_id")
    private Long id;

    @Column(nullable = false)
    private Long storeId;

    @Column(nullable = false)
    private Long menuId;

    @Column(nullable = false)
    private Long itemId;

    @Column(nullable = false, precision = 19, scale = 3)
    private BigDecimal quantity;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private RecipeAppliesTo appliesTo;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private RecipeSource source;

    @Column(nullable = false)
    private Instant validFrom;

    private Instant validTo;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(nullable = false)
    private Instant updatedAt;

    public static RecipeItem create(Long storeId, Long menuId, Long itemId, BigDecimal quantity,
                                    RecipeAppliesTo appliesTo, RecipeSource source, Instant validFrom) {
        RecipeItem recipeItem = new RecipeItem();
        recipeItem.storeId = storeId;
        recipeItem.menuId = menuId;
        recipeItem.itemId = itemId;
        recipeItem.quantity = quantity;
        recipeItem.appliesTo = appliesTo;
        recipeItem.source = source;
        recipeItem.validFrom = validFrom;
        return recipeItem;
    }

    /** 이 레시피 행을 at 시각부로 끝낸다 (새 레시피로 교체할 때) */
    public void close(Instant at) {
        this.validTo = at;
    }
}
