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
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.time.LocalDate;

/**
 * 매장 (store 표). 사업자등록 1건 = 매장 1개.
 * JSONB 칸(open_hours, closed_days, coupon_settings, onboarding_status)은 쓰는 기능을 만들 때 추가한다.
 * 다른 표와의 연결은 객체가 아니라 ID(Long)로 둔다: 다른 도메인 Entity 를 직접 쓰지 않는다는 규칙 (AGENTS.md 3-2).
 */
@Entity
@Table(name = "store")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Store {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "store_id")
    private Long id;

    @Column(nullable = false)
    private Long memberId;

    @JdbcTypeCode(SqlTypes.CHAR)   // DB 가 VARCHAR 가 아니라 CHAR(10)
    @Column(nullable = false, length = 10)
    private String bizRegNo;

    @Column(length = 100)
    private String bizName;

    @Column(nullable = false, length = 50)
    private String ownerName;

    @Column(nullable = false)
    private LocalDate businessOpenedOn;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private StoreVerifyStatus verifyStatus;

    private Instant verifiedAt;

    @Column(length = 100)
    private String name;

    @Column(length = 50)
    private String category;

    @Column(length = 255)
    private String address;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(nullable = false)
    private Instant updatedAt;

    /** 매장 등록. 사업자 진위확인은 3주차라 UNVERIFIED 로 둔다. 매장명은 정하기 전까지 상호로 채운다. */
    public static Store create(Long memberId, String bizRegNo, String bizName, String ownerName, LocalDate businessOpenedOn) {
        Store store = new Store();
        store.memberId = memberId;
        store.bizRegNo = bizRegNo;
        store.bizName = bizName;
        store.ownerName = ownerName;
        store.businessOpenedOn = businessOpenedOn;
        store.verifyStatus = StoreVerifyStatus.UNVERIFIED;
        store.name = bizName;
        return store;
    }
}
