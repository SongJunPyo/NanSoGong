package com.nansogong;

import com.jayway.jsonpath.JsonPath;
import com.nansogong.model.InventoryItem;
import com.nansogong.model.InventoryTransaction;
import com.nansogong.model.InventoryTransactionType;
import com.nansogong.model.ItemType;
import com.nansogong.model.ItemUnit;
import com.nansogong.model.Member;
import com.nansogong.model.Store;
import com.nansogong.repository.InventoryItemRepository;
import com.nansogong.repository.InventoryTransactionRepository;
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

import java.math.BigDecimal;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;
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
 * 실사 · 폐기 · 손실 흐름 (구현-3-6, UF-11): 실제 DB(Testcontainers)로 기준점이 바뀌는 것까지 확인한다.
 * 판매 차감 API 는 아직 없어서 판매 장부 행은 Repository 로 직접 넣는다.
 * TODO(매장 분리): StoreService.checkOwner 가 들어오면 "남의 매장 → 403" 경우를 추가한다.
 */
@SpringBootTest
@Import(TestcontainersConfig.class)
class InventoryStockAdjustmentFlowTest {

    @Autowired
    private WebApplicationContext context;
    @Autowired
    private MemberRepository memberRepository;
    @Autowired
    private StoreRepository storeRepository;
    @Autowired
    private InventoryItemRepository inventoryItemRepository;
    @Autowired
    private InventoryTransactionRepository inventoryTransactionRepository;

    private MockMvc mockMvc;
    private Long memberId;
    private Long storeId;
    private Long itemId;
    private String itemUrl;

    /** 초기 재고 기준 시각: 사흘 전 정각 */
    private final Instant t0 = Instant.now().minus(Duration.ofDays(3)).truncatedTo(ChronoUnit.HOURS);

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
        Member member = memberRepository.save(
                Member.create("t" + UUID.randomUUID().toString().substring(0, 20), "hash", "테스트", "010-0000-0000"));
        Store store = storeRepository.save(Store.create(member.getId(), "1234567890", "테스트카페", "테스트", LocalDate.of(2026, 1, 1)));
        memberId = member.getId();
        storeId = store.getId();
        itemId = newItem("우유").getId();
        itemUrl = "/api/stores/" + storeId + "/inventory-items/" + itemId;
    }

    private InventoryItem newItem(String name) {
        return inventoryItemRepository.save(InventoryItem.create(storeId, name, ItemType.INGREDIENT, null, ItemUnit.ML, "팩", new BigDecimal("1000")));
    }

    private ResultActions call(MockHttpServletRequestBuilder request) throws Exception {
        return mockMvc.perform(request.with(jwt().jwt(j -> j.subject(String.valueOf(memberId)))));
    }

    private String kst(Instant at) {
        return at.atOffset(ZoneOffset.ofHours(9)).toString();
    }

    private ResultActions postCount(String url, String path, String qty, Instant at) throws Exception {
        return call(post(url + path).contentType(MediaType.APPLICATION_JSON).content("""
                {"countedQty": %s, "countedAt": "%s"}
                """.formatted(qty, kst(at))));
    }

    private ResultActions postAdjustment(String url, String key, String type, String qty, Instant at) throws Exception {
        MockHttpServletRequestBuilder request = post(url + "/stock-adjustments").contentType(MediaType.APPLICATION_JSON).content("""
                {"type": "%s", "qty": %s, "occurredAt": "%s", "memo": "테스트"}
                """.formatted(type, qty, kst(at)));
        if (key != null) {
            request = request.header("Idempotency-Key", key);
        }
        return call(request);
    }

    private void sale(String qtyDelta, Instant occurredAt) {
        inventoryTransactionRepository.save(InventoryTransaction.record(storeId, itemId, InventoryTransactionType.SALE,
                new BigDecimal(qtyDelta), occurredAt, "TEST:" + UUID.randomUUID(), null));
    }

    private long ledgerRows() {
        return inventoryTransactionRepository.findAll().stream().filter(t -> t.getItemId().equals(itemId)).count();
    }

    @Test
    void 실사하면_그_수량이_새_기준점이_된다() throws Exception {
        postCount(itemUrl, "/initial-stock", "10000", t0).andExpect(status().isCreated());
        sale("-2000", t0.plus(Duration.ofHours(1)));
        Instant countAt = t0.plus(Duration.ofHours(2));

        // 저장 전 미리보기: 실사 시각 기준 추정 재고
        call(get(itemUrl + "/stock").param("at", kst(countAt)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.estimatedQty").value(8000))
                .andExpect(jsonPath("$.baseType").value("INITIAL"));

        // 실사: 실제로는 7500 → 추정 8000 과 차이 −500
        postCount(itemUrl, "/stock-counts", "7500", countAt)
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.countType").value("COUNT"))
                .andExpect(jsonPath("$.estimatedQty").value(8000))
                .andExpect(jsonPath("$.countedQty").value(7500))
                .andExpect(jsonPath("$.difference").value(-500));

        // 실사 이후 판매만 더한다. 실사 전에 일어난 판매가 늦게 들어와도 반영하지 않는다
        sale("-1000", countAt.plus(Duration.ofHours(1)));
        sale("-300", countAt.minus(Duration.ofMinutes(30)));

        String body = call(get(itemUrl + "/stock"))
                .andExpect(jsonPath("$.baseType").value("COUNT"))
                .andExpect(jsonPath("$.baseQty").value(7500))
                .andExpect(jsonPath("$.changeSinceBase").value(-1000))
                .andExpect(jsonPath("$.estimatedQty").value(6500))
                .andReturn().getResponse().getContentAsString();
        assertThat(Instant.parse(JsonPath.read(body, "$.baseAt"))).isEqualTo(countAt);

        // 과거 시각으로 조회하면 그때의 기준점(초기 재고)으로 계산한다.
        // 늦게 들어온 −300 은 실사 이후 계산에는 빠지지만, 실사 전 시각으로 보면 그때 일어난 일이라 들어간다
        call(get(itemUrl + "/stock").param("at", kst(t0.plus(Duration.ofMinutes(90)))))
                .andExpect(jsonPath("$.baseType").value("INITIAL"))
                .andExpect(jsonPath("$.estimatedQty").value(7700));   // 10000 − 2000 − 300
    }

    @Test
    void 폐기손실은_장부에_음수로_남고_재요청은_한번만_반영된다() throws Exception {
        postCount(itemUrl, "/initial-stock", "1000", t0).andExpect(status().isCreated());
        String key = UUID.randomUUID().toString();

        String first = postAdjustment(itemUrl, key, "DISPOSAL", "200.5", t0.plus(Duration.ofHours(1)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.txnType").value("DISPOSAL"))
                .andExpect(jsonPath("$.qtyDelta").value(-200.5))
                .andExpect(jsonPath("$.memo").value("테스트"))
                .andReturn().getResponse().getContentAsString();
        // 같은 키로 다시 보내면 (버튼 두 번 · 재전송) 새로 기록하지 않고 처음 기록을 돌려준다
        String again = postAdjustment(itemUrl, key, "DISPOSAL", "200.5", t0.plus(Duration.ofHours(1)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        assertThat((Integer) JsonPath.read(again, "$.id")).isEqualTo(JsonPath.read(first, "$.id"));

        // 키가 없으면 요청마다 새로 기록한다
        postAdjustment(itemUrl, null, "LOSS", "100", t0.plus(Duration.ofHours(2)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.txnType").value("LOSS"))
                .andExpect(jsonPath("$.qtyDelta").value(-100));

        assertThat(ledgerRows()).isEqualTo(2);
        call(get(itemUrl + "/stock")).andExpect(jsonPath("$.estimatedQty").value(699.5));   // 1000 − 200.5 − 100
    }

    @Test
    void 같은_키로_동시에_보내도_하나만_기록된다() throws Exception {
        postCount(itemUrl, "/initial-stock", "1000", t0).andExpect(status().isCreated());
        String key = UUID.randomUUID().toString();
        CountDownLatch start = new CountDownLatch(1);
        ExecutorService pool = Executors.newFixedThreadPool(2);
        try {
            List<Future<Integer>> futures = List.of(1, 2).stream().map(i -> pool.submit(() -> {
                start.await();
                return postAdjustment(itemUrl, key, "LOSS", "10", t0.plus(Duration.ofHours(1)))
                        .andReturn().getResponse().getStatus();
            })).toList();
            start.countDown();
            for (Future<Integer> f : futures) {
                assertThat(f.get()).isEqualTo(201);
            }
        } finally {
            pool.shutdownNow();
        }
        assertThat(ledgerRows()).isEqualTo(1);
    }

    @Test
    void 실패_경로() throws Exception {
        Instant later = t0.plus(Duration.ofHours(1));

        // 초기 재고 전 → 실사 · 폐기 모두 400
        postCount(itemUrl, "/stock-counts", "100", later).andExpect(status().isBadRequest());
        postAdjustment(itemUrl, null, "DISPOSAL", "10", later).andExpect(status().isBadRequest());

        postCount(itemUrl, "/initial-stock", "1000", t0).andExpect(status().isCreated());

        // 기준점과 같은 시각 실사 → 409, 이전 시각 → 400
        postCount(itemUrl, "/stock-counts", "900", t0).andExpect(status().isConflict());
        postCount(itemUrl, "/stock-counts", "900", t0.minusSeconds(1)).andExpect(status().isBadRequest());
        // 기준점 이전 · 같은 시각 폐기 → 400 (실사 수량에 이미 포함된 시기라 계산에 반영되지 않는다)
        postAdjustment(itemUrl, null, "DISPOSAL", "10", t0).andExpect(status().isBadRequest());
        postAdjustment(itemUrl, null, "DISPOSAL", "10", t0.minusSeconds(60)).andExpect(status().isBadRequest());

        // 미래 시각 · 수량 0 · 장부 종류 중 직접 등록할 수 없는 값(SALE) → 400
        Instant future = Instant.now().plus(Duration.ofHours(1));
        postCount(itemUrl, "/stock-counts", "900", future).andExpect(status().isBadRequest());
        postAdjustment(itemUrl, null, "LOSS", "10", future).andExpect(status().isBadRequest());
        postAdjustment(itemUrl, null, "LOSS", "0", later).andExpect(status().isBadRequest());
        postAdjustment(itemUrl, null, "SALE", "10", later).andExpect(status().isBadRequest());
        // 너무 긴 Idempotency-Key → 400
        postAdjustment(itemUrl, "k".repeat(94), "LOSS", "10", later).andExpect(status().isBadRequest());

        // 사용 중지 품목 → 400
        InventoryItem inactive = newItem("두유");
        String inactiveUrl = "/api/stores/" + storeId + "/inventory-items/" + inactive.getId();
        postCount(inactiveUrl, "/initial-stock", "100", t0).andExpect(status().isCreated());
        inactive.deactivate();
        inventoryItemRepository.save(inactive);
        postCount(inactiveUrl, "/stock-counts", "100", later).andExpect(status().isBadRequest());
        postAdjustment(inactiveUrl, null, "LOSS", "10", later).andExpect(status().isBadRequest());

        // 다른 매장 품목 → 404
        Store otherStore = storeRepository.save(Store.create(memberId, "9876543210", "다른카페", "테스트", LocalDate.of(2026, 1, 1)));
        String otherUrl = "/api/stores/" + otherStore.getId() + "/inventory-items/" + itemId;
        postCount(otherUrl, "/stock-counts", "100", later).andExpect(status().isNotFound());
        postAdjustment(otherUrl, null, "LOSS", "10", later).andExpect(status().isNotFound());

        // 실패한 요청은 아무것도 남기지 않는다: 우유는 초기 재고 그대로
        assertThat(ledgerRows()).isZero();
        call(get(itemUrl + "/stock"))
                .andExpect(jsonPath("$.baseType").value("INITIAL"))
                .andExpect(jsonPath("$.estimatedQty").value(1000));
    }
}
