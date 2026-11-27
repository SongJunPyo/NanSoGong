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
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

/**
 * AI 작업의 기준 기록 (ai_job 표, #34 ②). Spring 이 작업을 시작할 때 만들고 Python 보고로 갱신한다.
 * Python 의 보고 · 내부 호출에서 매장 · 사용자는 이 행으로 정한다 (요청 본문의 storeId 를 믿지 않는다).
 * 사용 규칙은 docs/rules/db.md "AI 작업 기록 (ai_job)".
 */
@Entity
@Table(name = "ai_job")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class AgentJob {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "ai_job_id")
    private Long id;

    @Column(nullable = false)
    private Long storeId;

    @Column(name = "requested_by_member_id")
    private Long requestedByMemberId;     // 정기 작업이면 null

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private AgentJobType jobType;

    @Column(nullable = false, length = 64)
    private String workflowKey;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private AgentJobStatus status;

    @Column(length = 50)
    private String currentStep;

    @Column(nullable = false)
    private int lastReportSeq;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(nullable = false)
    private Map<String, Object> requestParams;

    private Long suggestionId;

    private Long executionId;

    @Column(length = 50)
    private String errorCode;

    @Column(length = 500)
    private String errorMsg;

    @Column(length = 64)
    private String langsmithTraceId;

    private Instant startedAt;

    @Column(nullable = false)
    private Instant expiresAt;

    private Instant finishedAt;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(nullable = false)
    private Instant updatedAt;

    public static AgentJob create(Long storeId, Long requestedByMemberId, AgentJobType jobType, String workflowKey,
                                  Map<String, Object> requestParams, Instant expiresAt) {
        AgentJob job = new AgentJob();
        job.storeId = storeId;
        job.requestedByMemberId = requestedByMemberId;
        job.jobType = jobType;
        job.workflowKey = workflowKey;
        job.status = AgentJobStatus.PENDING;
        job.lastReportSeq = 0;
        job.requestParams = requestParams == null ? new HashMap<>() : new HashMap<>(requestParams);
        job.expiresAt = expiresAt;
        return job;
    }

    public boolean isActive() {
        return status.isActive();
    }

    /**
     * Python 보고 반영. 순번 · 끝난 작업 확인은 부르는 쪽(AgentJobService)이 행을 잠근 뒤 한다.
     * 끝난 상태로 바뀌면 finished_at 을 채운다 (DB CHECK: 진행 중 ⇔ finished_at 비어 있음).
     */
    public void applyReport(int seq, String step, AgentJobStatus newStatus, String errorCode, String traceId,
                            Instant now, Instant newExpiresAt) {
        this.lastReportSeq = seq;
        this.currentStep = step;
        this.status = newStatus;
        if (startedAt == null && newStatus != AgentJobStatus.PENDING) {
            this.startedAt = now;
        }
        if (errorCode != null) {
            this.errorCode = errorCode;
        }
        if (traceId != null) {
            this.langsmithTraceId = traceId;
        }
        if (newStatus.isActive()) {
            this.expiresAt = newExpiresAt;       // 보고가 오면 기한을 연장한다
        } else {
            this.finishedAt = now;
        }
    }

    /** 작업 결과로 저장된 제안을 연결한다 */
    public void linkSuggestion(Long suggestionId) {
        this.suggestionId = suggestionId;
    }
}
