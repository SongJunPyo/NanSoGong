package com.nansogong;

import com.jayway.jsonpath.JsonPath;
import com.nansogong.dto.InventoryStockCountRequest;
import com.nansogong.model.InventoryItem;
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
import com.nansogong.service.InventoryStockService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * 초기 재고 → 추정 재고 흐름 (구현-3-2, 3-5): 실제 DB(Testcontainers)로 기준 시각 경계까지 확인한다.
 * 장부 쓰기 API(판매 차감 · 폐기 · 입고)는 아직 없어서 장부 행은 Repository 로 직접 넣는다.
 */
@SpringBootTest
@Import(TestcontainersConfig.class)
class InventoryStockFlowTest {

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
    private InventoryStockService inventoryStockService;

    private MockMvc mockMvc;
    private Long memberId;
    private Long storeId;
    private Long itemId;
    private String itemUrl;

    /** 초기 재고 기준 시각: 이틀 전 정각 (초 단위로 맞춰 DB 저장 후에도 같은 값) */
    private final Instant baseAt = Instant.now().minus(Duration.ofDays(2)).truncatedTo(ChronoUnit.HOURS);

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
        Member member = memberRepository.save(
                Member.create("t" + UUID.randomUUID().toString().substring(0, 20), "hash", "테스트", "010-0000-0000"));
        Store store = storeRepository.save(Store.create(member.getId(), "1234567890", "테스트카페", "테스트", LocalDate.of(2026, 1, 1)));
        memberId = member.getId();
        storeId = store.getId();
        itemId = newItem(storeId, "우유").getId();
        itemUrl = "/api/stores/" + storeId + "/inventory-items/" + itemId;
    }

    private InventoryItem newItem(Long storeId, String name) {
        return inventoryItemRepository.save(InventoryItem.create(storeId, name, ItemType.INGREDIENT, null, ItemUnit.ML, "팩", new BigDecimal("1000")));
    }

    private ResultActions call(MockHttpServletRequestBuilder request) throws Exception {
        return mockMvc.perform(request.with(jwt().jwt(j -> j.subject(String.valueOf(memberId)))));
    }

    private ResultActions postInitial(String url, String qty, String countedAt) throws Exception {
        return call(post(url + "/initial-stock").contentType(MediaType.APPLICATION_JSON).content("""
                {"countedQty": %s, "countedAt": "%s"}
                """.formatted(qty, countedAt)));
    }

    /** 한국 시간 offset 을 붙인 ISO 8601 (화면이 보내는 모양) */
    private String kst(Instant at) {
        return at.atOffset(ZoneOffset.ofHours(9)).toString();
    }

    private void ledger(InventoryTransactionType type, String qtyDelta, Instant occurredAt) {
        inventoryTransactionRepository.save(InventoryTransaction.record(storeId, itemId, type, new BigDecimal(qtyDelta),
                occurredAt, "TEST:" + UUID.randomUUID(), null));
    }

    @Test
    void 초기재고부터_기준시각_이후_변동만_더한다() throws Exception {
        // 초기 재고 전: 0 이 아니라 미설정
        call(get(itemUrl + "/stock"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.initialized").value(false))
                .andExpect(jsonPath("$.estimatedQty").doesNotExist());

        postInitial(itemUrl, "10000", kst(baseAt))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.countType").value("INITIAL"))
                .andExpect(jsonPath("$.countedQty").value(10000))
                .andExpect(jsonPath("$.estimatedQty").doesNotExist());

        // 기준 이전 (늦게 들어온 판매 포함) · 같은 시각 → 기준 수량에 포함된 것으로 보고 빼고 계산
        ledger(InventoryTransactionType.SALE, "-300", baseAt.minus(Duration.ofHours(1)));
        ledger(InventoryTransactionType.SALE, "-100", baseAt);
        // 기준 이후 → 더한다
        ledger(InventoryTransactionType.SALE, "-2000", baseAt.plusSeconds(1));
        ledger(InventoryTransactionType.RECEIPT, "5000", baseAt.plus(Duration.ofDays(1)));
        ledger(InventoryTransactionType.DISPOSAL, "-500.5", baseAt.plus(Duration.ofDays(1)).plusSeconds(60));

        String body = call(get(itemUrl + "/stock"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.initialized").value(true))
                .andExpect(jsonPath("$.unit").value("ML"))
                .andExpect(jsonPath("$.baseType").value("INITIAL"))
                .andExpect(jsonPath("$.baseQty").value(10000))
                .andExpect(jsonPath("$.changeSinceBase").value(2499.5))      // −2000 + 5000 − 500.5
                .andExpect(jsonPath("$.estimatedQty").value(12499.5))
                .andReturn().getResponse().getContentAsString();
        assertThat(Instant.parse(JsonPath.read(body, "$.baseAt"))).isEqualTo(baseAt);
    }

    @Test
    void 초기재고는_품목당_한번만() throws Exception {
        postInitial(itemUrl, "500", kst(baseAt)).andExpect(status().isCreated());
        postInitial(itemUrl, "700", kst(baseAt.plusSeconds(3600))).andExpect(status().isConflict());

        call(get(itemUrl + "/stock")).andExpect(jsonPath("$.estimatedQty").value(500));
    }

    @Test
    void 동시에_두번_요청해도_하나만_저장된다() throws Exception {
        var request1 = new InventoryStockCountRequest(new BigDecimal("100"), baseAt.atOffset(ZoneOffset.UTC), null);
        var request2 = new InventoryStockCountRequest(new BigDecimal("200"), baseAt.plusSeconds(60).atOffset(ZoneOffset.UTC), null);
        CountDownLatch start = new CountDownLatch(1);
        ExecutorService pool = Executors.newFixedThreadPool(2);
        try {
            List<Callable<HttpStatus>> tasks = List.of(request1, request2).stream()
                    .<Callable<HttpStatus>>map(request -> () -> {
                        start.await();
                        try {
                            inventoryStockService.setInitialStock(memberId, storeId, itemId, request);
                            return HttpStatus.CREATED;
                        } catch (ResponseStatusException e) {
                            return HttpStatus.valueOf(e.getStatusCode().value());
                        }
                    })
                    .toList();
            List<Future<HttpStatus>> futures = tasks.stream().map(pool::submit).toList();
            start.countDown();
            List<HttpStatus> results = futures.stream().map(f -> {
                try {
                    return f.get();
                } catch (Exception e) {
                    throw new IllegalStateException(e);
                }
            }).toList();

            assertThat(results).containsExactlyInAnyOrder(HttpStatus.CREATED, HttpStatus.CONFLICT);
            assertThat(inventoryStockCountRepository.findAll().stream().filter(c -> c.getItemId().equals(itemId))).hasSize(1);
        } finally {
            pool.shutdownNow();
        }
    }

    @Test
    void 실패_경로() throws Exception {
        // 미래 시각 → 400
        postInitial(itemUrl, "100", kst(Instant.now().plus(Duration.ofHours(1)))).andExpect(status().isBadRequest());
        // 음수 · offset 없는 시각 → 400
        postInitial(itemUrl, "-1", kst(baseAt)).andExpect(status().isBadRequest());
        postInitial(itemUrl, "100", "2026-11-20T09:00:00").andExpect(status().isBadRequest());

        // 사용 중지된 품목 → 400
        InventoryItem inactive = newItem(storeId, "두유");
        inactive.deactivate();
        inventoryItemRepository.save(inactive);
        postInitial("/api/stores/" + storeId + "/inventory-items/" + inactive.getId(), "100", kst(baseAt))
                .andExpect(status().isBadRequest());

        // 없는 품목 · 다른 매장 품목 → 404
        postInitial("/api/stores/" + storeId + "/inventory-items/999999999", "100", kst(baseAt)).andExpect(status().isNotFound());
        Store otherStore = storeRepository.save(Store.create(memberId, "9876543210", "다른카페", "테스트", LocalDate.of(2026, 1, 1)));
        String otherUrl = "/api/stores/" + otherStore.getId() + "/inventory-items/" + itemId;
        postInitial(otherUrl, "100", kst(baseAt)).andExpect(status().isNotFound());
        call(get(otherUrl + "/stock")).andExpect(status().isNotFound());

        // 실패한 요청은 아무것도 남기지 않는다
        call(get(itemUrl + "/stock")).andExpect(jsonPath("$.initialized").value(false));

        // 토큰 없음 → 401
        mockMvc.perform(get(itemUrl + "/stock")).andExpect(status().isUnauthorized());
    }

    @Test
    void 남의_매장이면_403이고_초기재고가_남지_않는다() throws Exception {
        Member stranger = memberRepository.save(
                Member.create("s" + UUID.randomUUID().toString().substring(0, 20), "hash", "남", "010-1111-1111"));
        Store theirStore = storeRepository.save(Store.create(stranger.getId(), "1111111111", "남의카페", "남", LocalDate.of(2026, 1, 1)));
        Long theirItemId = newItem(theirStore.getId(), "남의 우유").getId();
        String theirItemUrl = "/api/stores/" + theirStore.getId() + "/inventory-items/" + theirItemId;

        postInitial(theirItemUrl, "100", kst(baseAt)).andExpect(status().isForbidden());
        call(get(theirItemUrl + "/stock")).andExpect(status().isForbidden());

        assertThat(inventoryStockCountRepository.findAll().stream().filter(c -> c.getItemId().equals(theirItemId))).isEmpty();
    }
}
