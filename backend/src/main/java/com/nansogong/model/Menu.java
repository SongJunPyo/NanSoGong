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

/** 메뉴와 옵션 (menu 표). 옵션은 parent_menu_id 로 기본 메뉴 하나에 붙는다. 삭제 대신 INACTIVE. */
@Entity
@Table(name = "menu")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Menu {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "menu_id")
    private Long id;

    @Column(nullable = false)
    private Long storeId;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(length = 50)
    private String category;

    @Column(nullable = false, precision = 19, scale = 2)
    private BigDecimal price;

    @Column(length = 50)
    private String spec;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private MenuSaleStatus saleStatus;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private MenuSource source;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private MenuType menuType;

    private Long parentMenuId;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(nullable = false)
    private Instant updatedAt;

    /** 기본 메뉴 등록 */
    public static Menu create(Long storeId, String name, String category, BigDecimal price, MenuSource source) {
        Menu menu = new Menu();
        menu.storeId = storeId;
        menu.name = name;
        menu.category = category;
        menu.price = price;
        menu.source = source;
        menu.saleStatus = MenuSaleStatus.ON_SALE;
        menu.menuType = MenuType.MENU;
        return menu;
    }

    /** 옵션 등록 (parent 는 같은 매장의 기본 메뉴여야 한다: 서비스에서 확인) */
    public static Menu createOption(Long storeId, Long parentMenuId, String name, BigDecimal price, MenuSource source) {
        Menu option = create(storeId, name, null, price, source);
        option.menuType = MenuType.OPTION;
        option.parentMenuId = parentMenuId;
        return option;
    }

    /** 이름 · 카테고리 · 가격 · 규격 수정 */
    public void update(String name, String category, BigDecimal price, String spec) {
        this.name = name;
        this.category = category;
        this.price = price;
        this.spec = spec;
    }

    /** 옵션 이름 · 가격 수정. 옵션은 카테고리 · 규격이 없고 0원도 된다 (서비스에서 옵션인지 확인) */
    public void updateOption(String name, BigDecimal price) {
        this.name = name;
        this.price = price;
    }

    /** 판매중 / 품절 / 비활성. 메뉴는 지우지 않고 INACTIVE 로 둔다 (지난 매출이 이 메뉴를 가리키고 있어서) */
    public void changeSaleStatus(MenuSaleStatus saleStatus) {
        this.saleStatus = saleStatus;
    }

    public boolean isOption() {
        return menuType == MenuType.OPTION;
    }
}
