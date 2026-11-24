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
 * POS · 공급처 · 금융 연동 (integration 표). 인증값 원문은 DB 에 넣지 않고 auth_ref(참조 이름)만 둔다.
 * JSONB 칸(data_scope, capabilities, sync_state)은 쓰는 기능을 만들 때 추가한다. sync_state 는 DB 기본값 '{}' 이 채운다.
 */
@Entity
@Table(name = "integration")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Integration {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "integration_id")
    private Long id;

    @Column(nullable = false)
    private Long storeId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private IntegrationProvider provider;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private IntegrationStatus status;

    @Column(length = 100)
    private String externalStoreId;

    @Column(length = 100)
    private String externalUserRef;

    @Column(nullable = false)
    private String authRef;

    private Instant tokenExpiresAt;

    @Column(nullable = false)
    private Instant connectedAt;

    private Instant disconnectedAt;

    private Instant lastSyncedAt;

    @Column(columnDefinition = "text")
    private String lastError;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(nullable = false)
    private Instant updatedAt;

    /** 연동 등록 (POS 연결 등) */
    public static Integration connect(Long storeId, IntegrationProvider provider, String externalStoreId, String authRef) {
        Integration integration = new Integration();
        integration.storeId = storeId;
        integration.provider = provider;
        integration.externalStoreId = externalStoreId;
        integration.authRef = authRef;
        integration.status = IntegrationStatus.CONNECTED;
        integration.connectedAt = Instant.now();
        return integration;
    }
}
