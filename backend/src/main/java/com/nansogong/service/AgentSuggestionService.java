package com.nansogong.service;

import com.nansogong.dto.AgentSuggestionSaveRequest;
import com.nansogong.dto.AgentSuggestionSavedResponse;
import com.nansogong.model.AgentJob;
import com.nansogong.model.Suggestion;
import com.nansogong.model.SuggestionStatus;
import com.nansogong.model.SuggestionType;
import com.nansogong.repository.AgentJobRepository;
import com.nansogong.repository.SuggestionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.EnumSet;
import java.util.Optional;

/**
 * 운영 제안 (suggestion) — AI 작업 결과 저장 (#35 ③).
 * 사장님용 목록 · 승인 · 보류 · 반려는 다음 이슈에서 이 서비스에 추가한다.
 */
@Service
@RequiredArgsConstructor
public class AgentSuggestionService {

    private static final ZoneId KST = ZoneId.of("Asia/Seoul");

    /** AI 제안의 기본 표시 순서 (같은 긴급도 안). 우선순위 계산 규칙이 정해지면 바꾼다 */
    static final int DEFAULT_PRIORITY = 100;

    private final AgentJobRepository agentJobRepository;
    private final SuggestionRepository suggestionRepository;

    /**
     * AI 작업 결과를 새 제안 버전으로 저장한다.
     * - 매장 · 업무 키는 ai_job 행 기준 (요청 본문의 값은 작업과 같은지만 본다)
     * - 이 작업이 이미 제안을 저장했으면 새 버전을 만들지 않고 그 제안을 돌려준다 (응답 유실 후 재시도 대비)
     * - 같은 업무의 결정 전 버전은 대체됨(SUPERSEDED)으로 바꾼다
     * - 버전은 매장 · 업무 키마다 센다. 셀 때 (store_id, workflow_key) 로 잠근다
     */
    @Transactional
    public AgentSuggestionSavedResponse saveFromJob(Long jobId, AgentSuggestionSaveRequest request) {
        AgentJob job = agentJobRepository.findByIdForUpdate(jobId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "AI 작업을 찾을 수 없습니다"));

        if (job.getSuggestionId() != null) {
            Suggestion saved = suggestionRepository.findById(job.getSuggestionId()).orElseThrow();
            return new AgentSuggestionSavedResponse(saved.getId(), saved.getVersion());
        }
        if (!job.isActive()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "이미 끝난 작업입니다: " + job.getStatus());
        }
        SuggestionType expected = job.getJobType().suggestionType();
        if (expected == null || expected != request.suggestionType()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "작업 종류(" + job.getJobType() + ")에 맞지 않는 제안 유형입니다: " + request.suggestionType());
        }
        if (!job.getWorkflowKey().equals(request.workflowKey())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "작업의 업무 키와 다릅니다");
        }

        Long storeId = job.getStoreId();
        String workflowKey = job.getWorkflowKey();
        suggestionRepository.lockWorkflow(storeId, workflowKey);   // 다른 작업이 같은 업무 키로 동시에 저장하면 버전이 겹친다
        Optional<Suggestion> latest = suggestionRepository.findFirstByStoreIdAndWorkflowKeyOrderByVersionDesc(storeId, workflowKey);
        suggestionRepository.findByStoreIdAndWorkflowKeyAndStatusIn(storeId, workflowKey,
                        EnumSet.of(SuggestionStatus.PENDING, SuggestionStatus.ON_HOLD, SuggestionStatus.NEEDS_FIX))
                .forEach(Suggestion::supersedeIfUndecided);

        Suggestion suggestion = suggestionRepository.save(Suggestion.createByAi(
                storeId, workflowKey,
                latest.map(s -> s.getVersion() + 1).orElse(1),
                latest.map(Suggestion::getId).orElse(null),
                expected, DEFAULT_PRIORITY, request.title(), request.summary(),
                request.payload(), request.evidence(), request.generationContext(),
                LocalDate.now(KST), request.langsmithTraceId()));
        job.linkSuggestion(suggestion.getId());
        return new AgentSuggestionSavedResponse(suggestion.getId(), suggestion.getVersion());
    }
}
