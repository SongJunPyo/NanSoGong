package com.nansogong.dto;

import com.nansogong.model.SuggestionType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.Map;

/**
 * AI 작업 결과를 제안으로 저장 (#35 ③, POST /internal/ai-jobs/{jobId}/suggestions).
 * 매장 · 업무 키는 ai_job 행 기준이라 workflowKey · suggestionType 은 작업과 같은지만 확인한다.
 */
public record AgentSuggestionSaveRequest(
        @NotBlank @Size(max = 64) String workflowKey,
        @NotNull SuggestionType suggestionType,
        @NotBlank @Size(max = 200) String title,
        @Size(max = 500) String summary,
        @NotNull Map<String, Object> payload,
        @NotNull Map<String, Object> evidence,
        Map<String, Object> generationContext,
        @Size(max = 64) String langsmithTraceId
) {}
