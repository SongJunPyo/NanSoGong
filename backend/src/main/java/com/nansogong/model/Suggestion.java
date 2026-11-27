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
import java.time.LocalDate;
import java.util.Map;

/**
 * 운영 제안의 한 버전 (suggestion 표). 같은 업무(workflow_key)의 버전은 1부터 늘어난다.
 * 승인 대상은 특정 버전이고, 승인된 payload 는 덮어쓰지 않는다 (바뀌면 새 버전).
 */
@Entity
@Table(name = "suggestion")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Suggestion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "suggestion_id")
    private Long id;

    @Column(nullable = false)
    private Long storeId;

    @Column(nullable = false, length = 64)
    private String workflowKey;

    @Column(nullable = false)
    private int version;

    private Long parentSuggestionId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private SuggestionChangeSource changeSource;

    @Column(length = 500)
    private String changeReason;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private SuggestionType suggestionType;

    @Enumerated(EnumType.STRING)
    @Column(name = "urgency_level", nullable = false, length = 10)
    private SuggestionUrgency urgency;

    @Column(nullable = false)
    private int priority;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(length = 500)
    private String summary;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(nullable = false)
    private Map<String, Object> payload;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(nullable = false)
    private Map<String, Object> evidence;

    @JdbcTypeCode(SqlTypes.JSON)
    private Map<String, Object> generationContext;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private SuggestionStatus status;

    @Column(nullable = false)
    private LocalDate businessDate;

    @Column(length = 64)
    private String langsmithTraceId;

    private Long addedMenuId;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(nullable = false)
    private Instant updatedAt;

    /** AI 가 만든 새 버전 (검토 대기) */
    public static Suggestion createByAi(Long storeId, String workflowKey, int version, Long parentSuggestionId,
                                        SuggestionType type, int priority, String title, String summary,
                                        Map<String, Object> payload, Map<String, Object> evidence,
                                        Map<String, Object> generationContext, LocalDate businessDate, String langsmithTraceId) {
        Suggestion s = new Suggestion();
        s.storeId = storeId;
        s.workflowKey = workflowKey;
        s.version = version;
        s.parentSuggestionId = parentSuggestionId;
        s.changeSource = SuggestionChangeSource.AI_GENERATED;
        s.suggestionType = type;
        s.urgency = SuggestionUrgency.NORMAL;
        s.priority = priority;
        s.title = title;
        s.summary = summary;
        s.payload = payload;
        s.evidence = evidence;
        s.generationContext = generationContext;
        s.status = SuggestionStatus.PENDING;
        s.businessDate = businessDate;
        s.langsmithTraceId = langsmithTraceId;
        return s;
    }

    /** 아직 결정 전인 버전이면 새 버전으로 대체됨 처리 (승인 · 반려 등 결정된 버전은 그대로 둔다) */
    public void supersedeIfUndecided() {
        if (status == SuggestionStatus.PENDING || status == SuggestionStatus.ON_HOLD || status == SuggestionStatus.NEEDS_FIX) {
            status = SuggestionStatus.SUPERSEDED;
        }
    }
}
