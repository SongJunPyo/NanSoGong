package com.nansogong.model;

/** 제안 상태 (suggestion.status) */
public enum SuggestionStatus {
    PENDING,        // 검토 대기
    ON_HOLD,        // 보류
    REJECTED,       // 반려
    APPROVED,       // 승인
    ACKNOWLEDGED,   // 확인 완료
    NEEDS_FIX,      // 보완 필요
    EXPIRED,        // 만료
    SUPERSEDED      // 새 버전으로 대체됨
}
