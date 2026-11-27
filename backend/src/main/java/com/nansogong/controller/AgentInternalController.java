package com.nansogong.controller;

import com.nansogong.dto.AgentJobReportRequest;
import com.nansogong.dto.AgentJobReportResponse;
import com.nansogong.dto.AgentSuggestionSaveRequest;
import com.nansogong.dto.AgentSuggestionSavedResponse;
import com.nansogong.dto.RecipeContextResponse;
import com.nansogong.dto.RecipeDraftValidateRequest;
import com.nansogong.dto.RecipeDraftValidateResponse;
import com.nansogong.service.AgentJobService;
import com.nansogong.service.AgentSuggestionService;
import io.swagger.v3.oas.annotations.Hidden;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Python AI 워커가 부르는 내부 API (#34 · #35). X-Internal-Token 으로만 들어온다 (사용자 JWT 불가, SecurityConfig).
 * 모든 경로는 jobId 아래 → 매장 · 사용자는 ai_job 행에서 정한다.
 * 계약 예시: contracts/recipe-draft/
 */
@Hidden   // 사장님용 Swagger 에는 보이지 않게
@RestController
@RequestMapping("/internal/ai-jobs/{jobId}")
@RequiredArgsConstructor
public class AgentInternalController {

    private final AgentJobService agentJobService;
    private final AgentSuggestionService agentSuggestionService;

    @GetMapping("/recipe-context")
    public RecipeContextResponse recipeContext(@PathVariable Long jobId) {
        return agentJobService.recipeContext(jobId);
    }

    @PostMapping("/recipe-drafts/validate")
    public RecipeDraftValidateResponse validateRecipeDraft(@PathVariable Long jobId, @Valid @RequestBody RecipeDraftValidateRequest request) {
        return agentJobService.validateRecipeDraft(jobId, request);
    }

    @PostMapping("/reports")
    public AgentJobReportResponse report(@PathVariable Long jobId, @Valid @RequestBody AgentJobReportRequest request) {
        return agentJobService.report(jobId, request);
    }

    @PostMapping("/suggestions")
    public AgentSuggestionSavedResponse saveSuggestion(@PathVariable Long jobId, @Valid @RequestBody AgentSuggestionSaveRequest request) {
        return agentSuggestionService.saveFromJob(jobId, request);
    }
}
