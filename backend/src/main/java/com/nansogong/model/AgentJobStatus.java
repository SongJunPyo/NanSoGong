package com.nansogong.model;

/** AI 작업 상태 (ai_job.status). 앞의 셋은 진행 중, 나머지는 끝난 상태 */
public enum AgentJobStatus {
    PENDING,        // 접수
    RUNNING,        // 진행 중
    WAITING_AUTH,   // 사용자 인증 대기
    SUCCEEDED,      // 완료
    FAILED,         // 실패 (error_code 필수)
    CANCELED,       // 취소
    SUPERSEDED;     // 대체됨

    public boolean isActive() {
        return this == PENDING || this == RUNNING || this == WAITING_AUTH;
    }
}
