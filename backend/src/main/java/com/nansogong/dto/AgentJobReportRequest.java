package com.nansogong.dto;

import com.nansogong.model.AgentJobStatus;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

/**
 * Python → Spring 진행 · 결과 보고 (#34 ②, POST /internal/ai-jobs/{jobId}/reports).
 *
 * @param seq    작업 안에서 1부터 늘어나는 보고 순번. 같으면 중복이라 무시, 작으면 순서 역전이라 거절
 * @param step   지금 단계 이름 (예: VALIDATE, SAVE)
 * @param status RUNNING · WAITING_AUTH · SUCCEEDED · FAILED 만 받는다
 */
public record AgentJobReportRequest(
        @NotNull @Positive Integer seq,
        @Size(max = 50) String step,
        @NotNull AgentJobStatus status,
        @Size(max = 50) String errorCode,
        @Size(max = 64) String langsmithTraceId
) {}
