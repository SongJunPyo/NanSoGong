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

import java.time.Instant;

/**
 * POS 메뉴 · 옵션 코드 ↔ 앱 메뉴 연결 (pos_menu_mapping 표).
 * 기본 메뉴는 posOptionCode 가 빈 문자열, 옵션은 POS 옵션 코드. 같은 옵션 코드라도 POS 메뉴 코드가 다르면 다른 행이다.
 */
@Entity
@Table(name = "pos_menu_mapping")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class PosMenuMapping {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "pos_menu_mapping_id")
    private Long id;

    @Column(nullable = false)
    private Long storeId;

    @Column(nullable = false)
    private Long integrationId;

    @Column(nullable = false, length = 100)
    private String posMenuCode;

    @Column(nullable = false, length = 100)
    private String posOptionCode;

    @Column(nullable = false, length = 100)
    private String posName;

    private Long menuId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private PosMappingStatus status;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(nullable = false)
    private Instant updatedAt;

    /** POS 에서 처음 본 메뉴·옵션: 아직 앱 메뉴와 연결 안 됨 */
    public static PosMenuMapping unmapped(Long storeId, Long integrationId, String posMenuCode, String posOptionCode, String posName) {
        PosMenuMapping mapping = new PosMenuMapping();
        mapping.storeId = storeId;
        mapping.integrationId = integrationId;
        mapping.posMenuCode = posMenuCode;
        mapping.posOptionCode = posOptionCode == null ? "" : posOptionCode;
        mapping.posName = posName;
        mapping.status = PosMappingStatus.UNMAPPED;
        return mapping;
    }

    /** 앱 메뉴와 연결 */
    public void mapTo(Long menuId) {
        this.menuId = menuId;
        this.status = PosMappingStatus.MAPPED;
    }

    /** 재고와 상관없는 옵션 등 연결에서 제외 (예: 얼음 적게) */
    public void exclude() {
        this.menuId = null;
        this.status = PosMappingStatus.EXCLUDED;
    }
}
