package com.nansogong.agent;

import com.nansogong.TestcontainersConfig;
import com.nansogong.model.AgentJob;
import com.nansogong.model.AgentJobStatus;
import com.nansogong.model.AgentJobType;
import com.nansogong.model.Member;
import com.nansogong.model.Menu;
import com.nansogong.model.MenuSource;
import com.nansogong.model.Store;
import com.nansogong.model.Suggestion;
import com.nansogong.model.SuggestionStatus;
import com.nansogong.repository.AgentJobRepository;
import com.nansogong.repository.MemberRepository;
import com.nansogong.repository.MenuRepository;
import com.nansogong.repository.StoreRepository;
import com.nansogong.repository.SuggestionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.WebApplicationContext;

import java.math.BigDecimal;
import java.sql.Timestamp;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Python AI 워커 → Spring 내부 API (#34 ② ③, #35) 흐름 테스트: 토큰 인증 → ai_job 기준 매장 → 서비스 → DB.
 */
@SpringBootTest(properties = "app.internal.token=" + AgentInternalApiFlowTest.TOKEN)
@Import(TestcontainersConfig.class)
@Transactional
class AgentInternalApiFlowTest {

    static final String TOKEN = "test-internal-token";

    @Autowired WebApplicationContext context;
    @Autowired MemberRepository memberRepository;
    @Autowired StoreRepository storeRepository;
    @Autowired MenuRepository menuRepository;
    @Autowired AgentJobRepository agentJobRepository;
    @Autowired SuggestionRepository suggestionRepository;
    @Autowired JdbcTemplate jdbc;

    MockMvc mvc;
    Long memberId, storeId, menuId, milkId;

    @BeforeEach
    void setUp() {
        mvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
        memberId = memberRepository.save(Member.create("internal-owner", "hash", "사장", "010-0000-0000")).getId();
        storeId = storeRepository.save(Store.create(memberId, "1230000093", "내카페", "사장", LocalDate.of(2023, 1, 1))).getId();
        menuId = menuRepository.save(Menu.create(storeId, "카페라떼", "커피", new BigDecimal("4500"), MenuSource.MANUAL)).getId();
        milkId = jdbc.queryForObject("INSERT INTO item (store_id, name, item_type, unit) VALUES (?, '우유', 'INGREDIENT', 'ML') RETURNING item_id",
                Long.class, storeId);
        jdbc.update("INSERT INTO item_cost (store_id, item_id, unit_cost, effective_from, source, created_at) VALUES (?, ?, 2.5, ?, 'MANUAL', now())",
                storeId, milkId, Timestamp.from(Instant.now().minus(Duration.ofDays(1))));
    }

    // ---- 인증 ----

    @Test
    void 토큰이_없거나_틀리면_401() throws Exception {
        Long jobId = job(AgentJobType.RECIPE_DRAFT, "recipe:1");
        mvc.perform(get(url(jobId, "/recipe-context"))).andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("INVALID_INTERNAL_TOKEN"));
        mvc.perform(get(url(jobId, "/recipe-context")).header("X-Internal-Token", "wrong")).andExpect(status().isUnauthorized());
    }

    @Test
    void 사장님_JWT_로는_내부_API에_들어올_수_없다() throws Exception {
        Long jobId = job(AgentJobType.RECIPE_DRAFT, "recipe:1");
        mvc.perform(get(url(jobId, "/recipe-context")).with(jwt().jwt(j -> j.subject(String.valueOf(memberId)))))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void 내부_토큰으로는_사장님_API에_들어올_수_없다() throws Exception {
        mvc.perform(get("/api/stores").header("X-Internal-Token", TOKEN)).andExpect(status().isUnauthorized());
    }

    // ---- 레시피 맥락 · 검증 ----

    @Test
    void 맥락은_작업의_매장_기준으로_나온다() throws Exception {
        Long jobId = job(AgentJobType.RECIPE_DRAFT, "recipe:1");
        call(get(url(jobId, "/recipe-context")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[0].name").value("우유"))
                .andExpect(jsonPath("$.items[0].unitCost").value(2.5))
                .andExpect(jsonPath("$.menus[0].name").value("카페라떼"));
    }

    @Test
    void 초안_검증은_Python_이_보내는_문자열_숫자를_받는다() throws Exception {
        Long jobId = job(AgentJobType.RECIPE_DRAFT, "recipe:1");
        call(post(url(jobId, "/recipe-drafts/validate")).contentType(MediaType.APPLICATION_JSON).content("""
                { "menuName": "딸기라떼", "description": "설명은 무시",
                  "lines": [ { "itemId": null, "itemName": "우유", "quantity": "0.2", "unit": "L" },
                             { "itemId": null, "itemName": "생딸기", "quantity": "50", "unit": "G" } ] }
                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.valid").value(true))
                .andExpect(jsonPath("$.lines[0].itemId").value(milkId))
                .andExpect(jsonPath("$.lines[0].normalizedQty").value(200.0))
                .andExpect(jsonPath("$.lines[1].reason").value("NEW_ITEM"))
                .andExpect(jsonPath("$.totalCost").value(org.hamcrest.Matchers.nullValue()));   // 새 재료가 있어 합계 없음 (null)
    }

    @Test
    void 초안_형식이_틀리면_400() throws Exception {
        Long jobId = job(AgentJobType.RECIPE_DRAFT, "recipe:1");
        call(post(url(jobId, "/recipe-drafts/validate")).contentType(MediaType.APPLICATION_JSON)
                .content("{ \"menuName\": \"딸기라떼\", \"lines\": [] }"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void 없는_작업은_404_레시피_작업이_아니면_409_끝난_작업이면_409() throws Exception {
        call(get(url(999_999L, "/recipe-context"))).andExpect(status().isNotFound());

        Long purchaseJob = job(AgentJobType.PURCHASE_SUGGEST, "purchase:1");
        call(get(url(purchaseJob, "/recipe-context"))).andExpect(status().isConflict());

        Long finished = job(AgentJobType.RECIPE_DRAFT, "recipe:2");
        report(finished, 1, "FAILED", "\"errorCode\": \"GENERATION_FAILED\",").andExpect(status().isOk());
        call(get(url(finished, "/recipe-context"))).andExpect(status().isConflict());
    }

    // ---- 진행 보고 ----

    @Test
    void 보고는_순번이_클_때만_반영하고_같으면_무시_작으면_거절() throws Exception {
        Long jobId = job(AgentJobType.RECIPE_DRAFT, "recipe:1");

        report(jobId, 1, "RUNNING", "").andExpect(status().isOk()).andExpect(jsonPath("$.applied").value(true));
        report(jobId, 1, "RUNNING", "").andExpect(status().isOk()).andExpect(jsonPath("$.applied").value(false));   // 재시도 중복
        report(jobId, 3, "RUNNING", "").andExpect(status().isOk()).andExpect(jsonPath("$.lastReportSeq").value(3));
        report(jobId, 2, "RUNNING", "").andExpect(status().isConflict());                                           // 순서 역전

        AgentJob job = agentJobRepository.findById(jobId).orElseThrow();
        assertThat(job.getStatus()).isEqualTo(AgentJobStatus.RUNNING);
        assertThat(job.getCurrentStep()).isEqualTo("VALIDATE");
        assertThat(job.getStartedAt()).isNotNull();
        assertThat(job.getExpiresAt()).isAfter(Instant.now());   // 보고마다 기한 연장
    }

    @Test
    void 끝난_작업의_보고는_거절하고_실패에는_코드가_필요하다() throws Exception {
        Long jobId = job(AgentJobType.RECIPE_DRAFT, "recipe:1");
        report(jobId, 1, "FAILED", "").andExpect(status().isBadRequest());                     // errorCode 없음
        report(jobId, 1, "PENDING", "").andExpect(status().isBadRequest());                    // Python 이 보낼 수 없는 상태

        report(jobId, 1, "SUCCEEDED", "").andExpect(status().isOk());
        assertThat(agentJobRepository.findById(jobId).orElseThrow().getFinishedAt()).isNotNull();
        report(jobId, 2, "RUNNING", "").andExpect(status().isConflict());                      // 늦게 온 보고가 끝난 작업을 살리지 않음
    }

    // ---- 제안 저장 ----

    @Test
    void 제안을_저장하고_같은_작업이_다시_저장하면_기존_제안을_돌려준다() throws Exception {
        Long jobId = job(AgentJobType.RECIPE_DRAFT, "recipe:1");
        String first = saveSuggestion(jobId, "recipe:1", "MENU").andExpect(status().isOk())
                .andExpect(jsonPath("$.version").value(1)).andReturn().getResponse().getContentAsString();
        String again = saveSuggestion(jobId, "recipe:1", "MENU").andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        assertThat(again).isEqualTo(first);   // 응답 유실 후 재시도해도 제안은 하나
        AgentJob job = agentJobRepository.findById(jobId).orElseThrow();
        Suggestion saved = suggestionRepository.findById(job.getSuggestionId()).orElseThrow();
        assertThat(saved.getStoreId()).isEqualTo(storeId);          // 매장은 작업 기준
        assertThat(saved.getStatus()).isEqualTo(SuggestionStatus.PENDING);
        assertThat(saved.getPayload()).containsEntry("menuName", "딸기라떼");
    }

    @Test
    void 같은_업무의_새_작업이_저장하면_버전이_오르고_이전_버전은_대체된다() throws Exception {
        Long first = job(AgentJobType.RECIPE_DRAFT, "recipe:1");
        saveSuggestion(first, "recipe:1", "MENU").andExpect(status().isOk());
        report(first, 1, "SUCCEEDED", "").andExpect(status().isOk());
        // 테스트는 한 트랜잭션이라 완료 상태가 아직 DB 에 안 갔다 → 직접 보내야 유일 인덱스가 "끝난 작업"으로 본다
        // (실제 서버는 요청마다 트랜잭션이 끝나서 바로 반영된다)
        agentJobRepository.flush();

        Long second = job(AgentJobType.RECIPE_DRAFT, "recipe:1");
        saveSuggestion(second, "recipe:1", "MENU").andExpect(status().isOk()).andExpect(jsonPath("$.version").value(2));

        Suggestion v1 = suggestionRepository.findById(agentJobRepository.findById(first).orElseThrow().getSuggestionId()).orElseThrow();
        Suggestion v2 = suggestionRepository.findById(agentJobRepository.findById(second).orElseThrow().getSuggestionId()).orElseThrow();
        assertThat(v1.getStatus()).isEqualTo(SuggestionStatus.SUPERSEDED);
        assertThat(v2.getParentSuggestionId()).isEqualTo(v1.getId());
    }

    @Test
    void 작업과_맞지_않는_유형이나_업무_키는_400() throws Exception {
        Long jobId = job(AgentJobType.RECIPE_DRAFT, "recipe:1");
        saveSuggestion(jobId, "recipe:1", "COUPON").andExpect(status().isBadRequest());
        saveSuggestion(jobId, "recipe:999", "MENU").andExpect(status().isBadRequest());
        assertThat(agentJobRepository.findById(jobId).orElseThrow().getSuggestionId()).isNull();
    }

    // ---- 도우미 ----

    private Long job(AgentJobType type, String workflowKey) {
        return agentJobRepository.save(AgentJob.create(storeId, memberId, type, workflowKey, Map.of("menuId", menuId),
                Instant.now().plus(Duration.ofMinutes(5)))).getId();
    }

    private String url(Long jobId, String path) {
        return "/internal/ai-jobs/" + jobId + path;
    }

    private ResultActions call(org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder request) throws Exception {
        return mvc.perform(request.header("X-Internal-Token", TOKEN));
    }

    private ResultActions report(Long jobId, int seq, String status, String extra) throws Exception {
        return call(post(url(jobId, "/reports")).contentType(MediaType.APPLICATION_JSON)
                .content("{ " + extra + " \"seq\": " + seq + ", \"step\": \"VALIDATE\", \"status\": \"" + status + "\" }"));
    }

    private ResultActions saveSuggestion(Long jobId, String workflowKey, String type) throws Exception {
        return call(post(url(jobId, "/suggestions")).contentType(MediaType.APPLICATION_JSON).content("""
                { "workflowKey": "%s", "suggestionType": "%s", "title": "딸기라떼 레시피 초안",
                  "payload": { "menuName": "딸기라떼", "lines": [ { "itemName": "우유", "quantity": "200", "unit": "ML" } ] },
                  "evidence": { "valid": true },
                  "generationContext": { "jobId": "%d", "graphVersion": "recipe-draft/2", "revisions": 0 } }
                """.formatted(workflowKey, type, jobId)));
    }
}
