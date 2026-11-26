package com.nansogong;

import com.jayway.jsonpath.JsonPath;
import com.nansogong.model.InventoryItem;
import com.nansogong.model.InventoryStockCount;
import com.nansogong.model.InventoryTransaction;
import com.nansogong.model.InventoryTransactionType;
import com.nansogong.model.ItemType;
import com.nansogong.model.ItemUnit;
import com.nansogong.model.Member;
import com.nansogong.model.Store;
import com.nansogong.repository.InventoryItemRepository;
import com.nansogong.repository.InventoryStockCountRepository;
import com.nansogong.repository.InventoryTransactionRepository;
import com.nansogong.repository.MemberRepository;
import com.nansogong.repository.StoreRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.containsInAnyOrder;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * 재고 현황 · 이력 흐름 (구현-3-4, UF-10): 실제 DB(Testcontainers)로 품목 여러 개의 상태 계산 · 필터 · 페이지를 확인한다.
 * 발주 검토 기준(reorder_point)은 에이전트가 넣을 값이라 API 가 없어서, 테스트에서는 SQL 로 직접 넣는다.
 */
@SpringBootTest
@Import(TestcontainersConfig.class)
class InventoryStockOverviewFlowTest {

    @Autowired
    private WebApplicationContext context;
    @Autowired
    private MemberRepository memberRepository;
    @Autowired
    private StoreRepository storeRepository;
    @Autowired
    private InventoryItemRepository inventoryItemRepository;
    @Autowired
    private InventoryStockCountRepository inventoryStockCountRepository;
    @Autowired
    private InventoryTransactionRepository inventoryTransactionRepository;
    @Autowired
    private JdbcTemplate jdbcTemplate;

    private MockMvc mockMvc;
    private Long memberId;
    private Long storeId;
    private String stocksUrl;

    private final Instant t0 = Instant.now().minus(Duration.ofDays(3)).truncatedTo(ChronoUnit.HOURS);

    private Long milkId;     // 10000 − 9500 = 500, 기준 1000   → SHORTAGE
    private Long beanId;     // 1000, 기준 없음                → NO_THRESHOLD
    private Long cupId;      // 초기 재고 없음                  → NOT_INITIALIZED
    private Long syrupId;    // 100 − 150 = −50               → CHECK_NEEDED
    private Long sugarId;    // 실사 5000 (초기 3000), 기준 1000 → ENOUGH

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
        Member member = memberRepository.save(
                Member.create("t" + UUID.randomUUID().toString().substring(0, 20), "hash", "테스트", "010-0000-0000"));
        memberId = member.getId();
        storeId = storeRepository.save(Store.create(memberId, "1234567890", "테스트카페", "테스트", LocalDate.of(2026, 1, 1))).getId();
        stocksUrl = "/api/stores/" + storeId + "/inventory-items/stocks";

        milkId = item(storeId, "우유", ItemUnit.ML);
        beanId = item(storeId, "원두", ItemUnit.G);
        cupId = item(storeId, "컵", ItemUnit.EA);
        syrupId = item(storeId, "시럽", ItemUnit.ML);
        sugarId = item(storeId, "설탕", ItemUnit.G);

        initial(milkId, "10000", t0);
        ledger(milkId, InventoryTransactionType.SALE, "-9500", t0.plus(Duration.ofHours(5)));
        reorderPoint(milkId, "1000");

        initial(beanId, "1000", t0);

        initial(syrupId, "100", t0);
        ledger(syrupId, InventoryTransactionType.SALE, "-150", t0.plus(Duration.ofHours(1)));

        initial(sugarId, "3000", t0);
        ledger(sugarId, InventoryTransactionType.SALE, "-500", t0.plus(Duration.ofHours(1)));   // 실사 전 → 빠짐
        inventoryStockCountRepository.save(InventoryStockCount.count(storeId, sugarId, new BigDecimal("2500"),
                new BigDecimal("5000"), t0.plus(Duration.ofHours(2)), null));
        reorderPoint(sugarId, "1000");
    }

    private Long item(Long storeId, String name, ItemUnit unit) {
        return inventoryItemRepository.save(InventoryItem.create(storeId, name, ItemType.INGREDIENT, null, unit, null, null)).getId();
    }

    private void initial(Long itemId, String qty, Instant at) {
        inventoryStockCountRepository.save(InventoryStockCount.initial(storeId, itemId, new BigDecimal(qty), at, null));
    }

    private void ledger(Long itemId, InventoryTransactionType type, String qtyDelta, Instant occurredAt) {
        inventoryTransactionRepository.save(InventoryTransaction.record(storeId, itemId, type, new BigDecimal(qtyDelta),
                occurredAt, "TEST:" + UUID.randomUUID(), null));
    }

    private void reorderPoint(Long itemId, String qty) {
        jdbcTemplate.update("update item set reorder_point = ? where item_id = ?", new BigDecimal(qty), itemId);
    }

    private ResultActions call(MockHttpServletRequestBuilder request) throws Exception {
        return mockMvc.perform(request.with(jwt().jwt(j -> j.subject(String.valueOf(memberId)))));
    }

    /** 응답 content 에서 itemId 로 한 줄 찾기 */
    private Object field(String body, Long itemId, String field) {
        List<Object> values = JsonPath.read(body, "$.content[?(@.itemId == " + itemId + ")]." + field);
        assertThat(values).hasSize(1);
        return values.get(0);
    }

    @Test
    void 품목별_추정재고와_상태를_이름순으로_보여준다() throws Exception {
        String body = call(get(stocksUrl))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(5))
                .andExpect(jsonPath("$.content[*].name").value(contains("설탕", "시럽", "우유", "원두", "컵")))
                .andReturn().getResponse().getContentAsString();

        assertThat(field(body, milkId, "status")).isEqualTo("SHORTAGE");
        assertThat(((Number) field(body, milkId, "estimatedQty")).doubleValue()).isEqualTo(500);
        assertThat(((Number) field(body, milkId, "reorderPoint")).doubleValue()).isEqualTo(1000);
        assertThat(Instant.parse((String) field(body, milkId, "lastChangedAt"))).isEqualTo(t0.plus(Duration.ofHours(5)));

        assertThat(field(body, beanId, "status")).isEqualTo("NO_THRESHOLD");
        assertThat(field(body, beanId, "lastChangedAt")).isNull();

        assertThat(field(body, cupId, "status")).isEqualTo("NOT_INITIALIZED");
        assertThat(field(body, cupId, "estimatedQty")).isNull();
        assertThat(field(body, cupId, "baseAt")).isNull();

        assertThat(field(body, syrupId, "status")).isEqualTo("CHECK_NEEDED");
        assertThat(((Number) field(body, syrupId, "estimatedQty")).doubleValue()).isEqualTo(-50);

        // 최근 기준점은 실사: 실사 전 판매는 빼고 실사 수량 그대로
        assertThat(field(body, sugarId, "status")).isEqualTo("ENOUGH");
        assertThat(field(body, sugarId, "baseType")).isEqualTo("COUNT");
        assertThat(((Number) field(body, sugarId, "estimatedQty")).doubleValue()).isEqualTo(5000);
        assertThat(Instant.parse((String) field(body, sugarId, "baseAt"))).isEqualTo(t0.plus(Duration.ofHours(2)));
    }

    @Test
    void 상태_이름_사용여부로_거르고_페이지로_자른다() throws Exception {
        // 확인이 필요한 품목만 (부족 + 기록 확인 필요)
        call(get(stocksUrl).param("status", "SHORTAGE", "CHECK_NEEDED"))
                .andExpect(jsonPath("$.totalElements").value(2))
                .andExpect(jsonPath("$.content[*].name").value(containsInAnyOrder("우유", "시럽")));

        // 이름 부분 검색
        call(get(stocksUrl).param("name", "우"))
                .andExpect(jsonPath("$.content[*].name").value(contains("우유")));

        // 사용 중지 품목은 active=true 에서 빠진다
        InventoryItem bean = inventoryItemRepository.findById(beanId).orElseThrow();
        bean.deactivate();
        inventoryItemRepository.save(bean);
        call(get(stocksUrl).param("active", "true")).andExpect(jsonPath("$.totalElements").value(4));
        call(get(stocksUrl).param("active", "false")).andExpect(jsonPath("$.content[*].name").value(contains("원두")));

        // 페이지: 5개를 2개씩 → 마지막 페이지는 1개
        call(get(stocksUrl).param("page", "2").param("size", "2"))
                .andExpect(jsonPath("$.totalElements").value(5))
                .andExpect(jsonPath("$.content[*].name").value(contains("컵")));
        // 범위를 넘은 페이지는 빈 목록
        call(get(stocksUrl).param("page", "9").param("size", "2"))
                .andExpect(jsonPath("$.content").isEmpty());

        // 없는 상태 값 → 400
        call(get(stocksUrl).param("status", "WRONG")).andExpect(status().isBadRequest());
    }

    @Test
    void 다른_매장_품목은_섞이지_않는다() throws Exception {
        Long otherStoreId = storeRepository.save(Store.create(memberId, "9876543210", "다른카페", "테스트", LocalDate.of(2026, 1, 1))).getId();
        item(otherStoreId, "다른매장 우유", ItemUnit.ML);

        call(get(stocksUrl)).andExpect(jsonPath("$.totalElements").value(5));
        call(get("/api/stores/" + otherStoreId + "/inventory-items/stocks"))
                .andExpect(jsonPath("$.content[*].name").value(contains("다른매장 우유")))
                .andExpect(jsonPath("$.content[0].status").value("NOT_INITIALIZED"));
    }

    @Test
    void 품목별_실사_장부_이력을_최신순으로_보여준다() throws Exception {
        String sugarUrl = "/api/stores/" + storeId + "/inventory-items/" + sugarId;
        call(get(sugarUrl + "/stock-counts"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[*].countType").value(contains("COUNT", "INITIAL")))
                .andExpect(jsonPath("$.content[0].difference").value(2500));   // 실사 5000 − 추정 2500

        String milkUrl = "/api/stores/" + storeId + "/inventory-items/" + milkId;
        ledger(milkId, InventoryTransactionType.DISPOSAL, "-100", t0.plus(Duration.ofHours(6)));
        call(get(milkUrl + "/transactions"))
                .andExpect(jsonPath("$.content[*].txnType").value(contains("DISPOSAL", "SALE")))
                .andExpect(jsonPath("$.content[*].qtyDelta").value(contains(-100.0, -9500.0)));

        // 없는 품목 · 다른 매장 품목 → 404
        call(get("/api/stores/" + storeId + "/inventory-items/999999999/transactions")).andExpect(status().isNotFound());
        Long otherStoreId = storeRepository.save(Store.create(memberId, "9876543210", "다른카페", "테스트", LocalDate.of(2026, 1, 1))).getId();
        call(get("/api/stores/" + otherStoreId + "/inventory-items/" + milkId + "/stock-counts")).andExpect(status().isNotFound());
    }

    @Test
    void 남의_매장이면_403() throws Exception {
        Member stranger = memberRepository.save(
                Member.create("s" + UUID.randomUUID().toString().substring(0, 20), "hash", "남", "010-1111-1111"));
        Long theirStoreId = storeRepository.save(Store.create(stranger.getId(), "1111111111", "남의카페", "남", LocalDate.of(2026, 1, 1))).getId();
        Long theirItemId = item(theirStoreId, "남의 우유", ItemUnit.ML);
        String theirItemUrl = "/api/stores/" + theirStoreId + "/inventory-items/" + theirItemId;

        call(get("/api/stores/" + theirStoreId + "/inventory-items/stocks")).andExpect(status().isForbidden());
        call(get(theirItemUrl + "/stock-counts")).andExpect(status().isForbidden());
        call(get(theirItemUrl + "/transactions")).andExpect(status().isForbidden());
    }
}
