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
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 매장 (store 표). 사업자등록 1건 = 매장 1개.
 * 영업시간·휴무일·초기 설정 상태는 기존 JSONB 칸에 저장한다. coupon_settings는 아직 매핑하지 않는다.
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
    @Column(nullable = false, unique = true, length = 10)
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

    @JdbcTypeCode(SqlTypes.JSON)
    private Map<String, List<String>> openHours;

    @JdbcTypeCode(SqlTypes.JSON)
    private List<String> closedDays;

    @JdbcTypeCode(SqlTypes.JSON)
    private Map<String, Boolean> onboardingStatus;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(nullable = false)
    private Instant updatedAt;

    /** 내부 미검증 등록. 외부 확인 없이 VERIFIED로 바꾸지 않는다. */
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

    /** 서버에서 정보 일치·계속사업자를 확인한 가입 처리에서만 사용한다. */
    public static Store createVerified(Long memberId, String bizRegNo, String bizName, String ownerName, LocalDate businessOpenedOn) {
        Store store = create(memberId, bizRegNo, bizName, ownerName, businessOpenedOn);
        store.verifyStatus = StoreVerifyStatus.VERIFIED;
        store.verifiedAt = Instant.now();
        return store;
    }

    public void configureBasics(String name, String category, String address, Map<String, List<String>> openHours, List<String> closedDays) {
        this.name = name;
        this.category = category;
        this.address = address;
        this.openHours = Map.copyOf(openHours);
        this.closedDays = List.copyOf(closedDays);
        Map<String, Boolean> status = new HashMap<>(onboardingStatus == null ? Map.of() : onboardingStatus);
        status.put("storeBasics", true);
        this.onboardingStatus = status;
    }
}
