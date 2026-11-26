package com.nansogong;

import com.jayway.jsonpath.JsonPath;
import com.nansogong.model.Member;
import com.nansogong.model.Store;
import com.nansogong.repository.MemberRepository;
import com.nansogong.repository.StoreRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import java.time.LocalDate;
import java.util.UUID;

import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.not;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * 품목 등록 흐름 (구현-3-1): 요청 → 저장 → 조회 결과까지 실제 DB(Testcontainers)로 따라간다.
 * TODO(매장 분리): StoreService.checkOwner 가 들어오면 "남의 매장 → 403" 경우를 추가한다.
 */
@SpringBootTest
@Import(TestcontainersConfig.class)
class InventoryItemFlowTest {

    @Autowired
    private WebApplicationContext context;
    @Autowired
    private MemberRepository memberRepository;
    @Autowired
    private StoreRepository storeRepository;

    private MockMvc mockMvc;
    private Long memberId;
    private Long storeId;
    private String baseUrl;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
        Member member = memberRepository.save(
                Member.create("t" + UUID.randomUUID().toString().substring(0, 20), "hash", "테스트", "010-0000-0000"));
        Store store = storeRepository.save(Store.create(member.getId(), "%09d1".formatted(member.getId()), "테스트카페", "테스트", LocalDate.of(2026, 1, 1)));
        memberId = member.getId();
        storeId = store.getId();
        baseUrl = "/api/stores/" + storeId + "/inventory-items";
    }

    private ResultActions call(MockHttpServletRequestBuilder request) throws Exception {
        return mockMvc.perform(request.with(jwt().jwt(j -> j.subject(String.valueOf(memberId)))));
    }

    private ResultActions postJson(String url, String body) throws Exception {
        return call(post(url).contentType(MediaType.APPLICATION_JSON).content(body));
    }

    private Long createItem(String name) throws Exception {
        String body = postJson(baseUrl, """
                {"name": "%s", "itemType": "INGREDIENT", "category": "커피", "unit": "G", "purchaseUnit": "봉", "packSize": 1000}
                """.formatted(name))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return Long.valueOf(JsonPath.read(body, "$.id").toString());
    }

    @Test
    void 등록하고_조회하고_수정한다() throws Exception {
        // 등록: 이름 앞뒤 공백은 지운다
        String body = postJson(baseUrl, """
                {"name": "  원두  ", "itemType": "INGREDIENT", "category": "커피", "unit": "G", "purchaseUnit": "봉", "packSize": 1000.5}
                """)
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name").value("원두"))
                .andExpect(jsonPath("$.unit").value("G"))
                .andExpect(jsonPath("$.packSize").value(1000.5))
                .andExpect(jsonPath("$.active").value(true))
                .andReturn().getResponse().getContentAsString();
        Long itemId = Long.valueOf(JsonPath.read(body, "$.id").toString());

        // 하나 조회: 저장된 값이 그대로 나온다 (소수 자릿수 유지)
        call(get(baseUrl + "/" + itemId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("원두"))
                .andExpect(jsonPath("$.packSize").value(1000.5));

        // 목록: 이름 부분 검색
        call(get(baseUrl).param("name", "원"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[*].name").value(hasItem("원두")));

        // 수정: unit 을 보내도 관리 단위는 바뀌지 않는다
        call(put(baseUrl + "/" + itemId).contentType(MediaType.APPLICATION_JSON).content("""
                {"name": "원두(케냐)", "itemType": "INGREDIENT", "category": null, "unit": "ML", "purchaseUnit": "봉", "packSize": 500}
                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("원두(케냐)"))
                .andExpect(jsonPath("$.unit").value("G"))
                .andExpect(jsonPath("$.category").doesNotExist())
                .andExpect(jsonPath("$.packSize").value(500));

        call(get(baseUrl + "/" + itemId))
                .andExpect(jsonPath("$.unit").value("G"))
                .andExpect(jsonPath("$.name").value("원두(케냐)"));
    }

    @Test
    void 사용중지하면_목록에서_빠지고_같은_이름으로_다시_등록할_수_있다() throws Exception {
        Long itemId = createItem("우유");

        // 사용 중 품목과 같은 이름은 409 (등록 · 수정 모두)
        postJson(baseUrl, """
                {"name": "우유", "itemType": "INGREDIENT", "unit": "ML"}
                """).andExpect(status().isConflict());
        Long otherId = createItem("두유");
        call(put(baseUrl + "/" + otherId).contentType(MediaType.APPLICATION_JSON).content("""
                {"name": "우유", "itemType": "INGREDIENT"}
                """)).andExpect(status().isConflict());

        // 사용 중지 → 204, 두 번 해도 204 (한 번만 반영)
        call(patch(baseUrl + "/" + itemId + "/deactivate")).andExpect(status().isNoContent());
        call(patch(baseUrl + "/" + itemId + "/deactivate")).andExpect(status().isNoContent());

        call(get(baseUrl + "/" + itemId)).andExpect(jsonPath("$.active").value(false));
        call(get(baseUrl).param("active", "true"))
                .andExpect(jsonPath("$.content[*].id").value(not(hasItem(itemId.intValue()))));
        call(get(baseUrl).param("active", "false"))
                .andExpect(jsonPath("$.content[*].id").value(hasItem(itemId.intValue())));

        // 지운 게 아니라서 같은 이름으로 새 품목을 만들 수 있다
        createItem("우유");
    }

    @Test
    void 실패_경로() throws Exception {
        // 필수값 누락 · 포장 규격 0 → 400
        postJson(baseUrl, """
                {"name": "컵", "itemType": "PACKAGING"}
                """).andExpect(status().isBadRequest());
        postJson(baseUrl, """
                {"name": "컵", "itemType": "PACKAGING", "unit": "EA", "packSize": 0}
                """).andExpect(status().isBadRequest());

        // 없는 품목 → 404
        call(get(baseUrl + "/999999999")).andExpect(status().isNotFound());

        // 다른 매장 품목을 내 매장 주소로 부르면 → 404 (다른 매장 품목은 보이지 않는다)
        Long itemId = createItem("시럽");
        Store otherStore = storeRepository.save(Store.create(memberId, "%09d2".formatted(memberId), "다른카페", "테스트", LocalDate.of(2026, 1, 1)));
        call(get("/api/stores/" + otherStore.getId() + "/inventory-items/" + itemId)).andExpect(status().isNotFound());

        // 토큰 없음 → 401
        mockMvc.perform(get(baseUrl)).andExpect(status().isUnauthorized());
    }
}
