package com.nansogong.service;

import com.nansogong.dto.AgentJobReportRequest;
import com.nansogong.dto.AgentJobReportResponse;
import com.nansogong.dto.RecipeContextResponse;
import com.nansogong.dto.RecipeDraftValidateRequest;
import com.nansogong.dto.RecipeDraftValidateResponse;
import com.nansogong.model.AgentJob;
import com.nansogong.model.AgentJobStatus;
import com.nansogong.model.AgentJobType;
import com.nansogong.repository.AgentJobRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Duration;
import java.time.Instant;
import java.util.EnumSet;
import java.util.Set;

/**
 * AI 작업 기록 (ai_job) — Python 내부 호출 쪽 (#34 ②, #35).
 * 내부 API 는 사용자 JWT 가 아니라 내부 토큰으로 들어오므로 checkOwner 대신 ai_job 행의 매장 · 요청자를 기준으로 삼는다.
 * 규칙: docs/rules/db.md "AI 작업 기록 (ai_job)".
 */
@Service
@RequiredArgsConstructor
public class AgentJobService {

    /** 보고가 오면 이만큼 기한을 연장한다 (작업 종류별) */
    static Duration timeoutOf(AgentJobType type) {
        return switch (type) {
            case RECIPE_DRAFT, NEW_MENU_SUGGEST -> Duration.ofMinutes(5);
            case COUPON_SUGGEST, OPERATIONS_ANALYSIS -> Duration.ofMinutes(10);
            case PURCHASE_SUGGEST, PURCHASE_EXECUTE -> Duration.ofMinutes(15);
        };
    }

    /** 인증 대기(WAITING_AUTH) 기한. 대기 중에는 보고가 오지 않는다 */
    static final Duration AUTH_WAIT = Duration.ofMinutes(30);

    /** Python 이 보고할 수 있는 상태. PENDING(접수) · CANCELED · SUPERSEDED 는 Spring 이 정한다 */
    private static final Set<AgentJobStatus> REPORTABLE = EnumSet.of(
            AgentJobStatus.RUNNING, AgentJobStatus.WAITING_AUTH, AgentJobStatus.SUCCEEDED, AgentJobStatus.FAILED);

    private static final Set<AgentJobType> RECIPE_JOBS = EnumSet.of(AgentJobType.RECIPE_DRAFT, AgentJobType.NEW_MENU_SUGGEST);

    private final AgentJobRepository agentJobRepository;
    private final RecipeDraftService recipeDraftService;   // 메뉴 도메인은 service 로만 부른다

    /** #35 ① 레시피 초안 맥락: 작업의 매장 · 요청자로 조회한다 */
    @Transactional(readOnly = true)
    public RecipeContextResponse recipeContext(Long jobId) {
        AgentJob job = requireRecipeJob(jobId);
        return recipeDraftService.context(job.getRequestedByMemberId(), job.getStoreId());
    }

    /** #35 ② 레시피 초안 검증 */
    @Transactional(readOnly = true)
    public RecipeDraftValidateResponse validateRecipeDraft(Long jobId, RecipeDraftValidateRequest request) {
        AgentJob job = requireRecipeJob(jobId);
        return recipeDraftService.validate(job.getRequestedByMemberId(), job.getStoreId(), request);
    }

    /**
     * #34 ② 진행 · 결과 보고. 작업 행을 잠근 뒤 순번을 비교한다.
     * - 순번이 같으면 중복이라 반영하지 않고 그대로 돌려준다 (applied = false). 끝난 작업이어도 같다 (마지막 보고의 응답 유실 후 재시도)
     * - 끝난 작업(완료 · 실패 · 취소 · 대체)에 온 새 보고는 거절 (409)
     * - 순번이 작으면 순서가 뒤바뀐 보고라 거절 (409)
     * - 제안을 만드는 작업은 제안을 저장하기 전에 완료(SUCCEEDED)로 끝낼 수 없다 (409)
     */
    @Transactional
    public AgentJobReportResponse report(Long jobId, AgentJobReportRequest request) {
        AgentJob job = agentJobRepository.findByIdForUpdate(jobId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "AI 작업을 찾을 수 없습니다"));
        if (!REPORTABLE.contains(request.status())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "보고할 수 없는 상태입니다: " + request.status());
        }
        if (request.status() == AgentJobStatus.FAILED && (request.errorCode() == null || request.errorCode().isBlank())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "실패 보고에는 errorCode 가 필요합니다");
        }
        int seq = request.seq();
        if (seq == job.getLastReportSeq()) {
            return toResponse(job, false);   // 재시도로 같은 보고가 다시 옴 (끝난 작업의 마지막 보고 포함)
        }
        if (!job.isActive()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "이미 끝난 작업입니다: " + job.getStatus());
        }
        if (seq < job.getLastReportSeq()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "순서가 뒤바뀐 보고입니다 (마지막 순번 " + job.getLastReportSeq() + ")");
        }
        if (request.status() == AgentJobStatus.SUCCEEDED && job.getJobType().suggestionType() != null && job.getSuggestionId() == null) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "제안을 먼저 저장해 주세요 (제안 없이 완료할 수 없는 작업)");
        }
        Instant now = Instant.now();
        Duration extend = request.status() == AgentJobStatus.WAITING_AUTH ? AUTH_WAIT : timeoutOf(job.getJobType());
        job.applyReport(seq, request.step(), request.status(), request.errorCode(), request.langsmithTraceId(), now, now.plus(extend));
        return toResponse(job, true);
    }

    /** 레시피 작업이고, 진행 중이고, 요청한 사장님이 있어야 한다 */
    private AgentJob requireRecipeJob(Long jobId) {
        AgentJob job = agentJobRepository.findById(jobId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "AI 작업을 찾을 수 없습니다"));
        if (!RECIPE_JOBS.contains(job.getJobType())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "레시피 작업이 아닙니다: " + job.getJobType());
        }
        if (!job.isActive()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "이미 끝난 작업입니다: " + job.getStatus());
        }
        if (job.getRequestedByMemberId() == null) {
            // 레시피 초안 · 신메뉴 추천은 사장님이 화면에서 시작하는 작업이라 요청자가 있어야 한다
            throw new ResponseStatusException(HttpStatus.CONFLICT, "요청한 사용자가 없는 레시피 작업입니다");
        }
        return job;
    }

    private AgentJobReportResponse toResponse(AgentJob job, boolean applied) {
        return new AgentJobReportResponse(job.getId(), applied, job.getStatus(), job.getLastReportSeq());
    }
}
