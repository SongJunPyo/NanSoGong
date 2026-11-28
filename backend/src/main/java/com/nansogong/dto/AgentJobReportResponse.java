package com.nansogong.dto;

import com.nansogong.model.AgentJobStatus;

/**
 * 보고 처리 결과.
 *
 * @param applied 이번 보고를 반영했으면 true. 같은 순번이 다시 와서 무시했으면 false (오류 아님)
 */
public record AgentJobReportResponse(Long jobId, boolean applied, AgentJobStatus status, int lastReportSeq) {}
