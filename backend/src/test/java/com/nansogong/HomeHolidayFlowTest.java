package com.nansogong;

import com.nansogong.model.Member;
import com.nansogong.model.Store;
import com.nansogong.repository.MemberRepository;
import com.nansogong.repository.StoreRepository;
import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import tools.jackson.databind.json.JsonMapper;

import java.io.IOException;
import java.net.InetSocketAddress;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Testcontainers DB의 실제 로그인 → 매장 권한 → 공휴일 가짜 HTTP 서버 → API·Swagger 흐름. */
@SpringBootTest(properties = {"app.external.data-go-kr-service-key=do-not-forward-real-key", "app.verification.mode=mock"})
@AutoConfigureMockMvc
@Import(TestcontainersConfig.class)
class HomeHolidayFlowTest {
    private static final JsonMapper JSON = JsonMapper.builder().build();
    private static final AtomicInteger CALLS = new AtomicInteger();
    private static final AtomicInteger YEARS = new AtomicInteger(2040);
    private static final AtomicReference<String> MODE = new AtomicReference<>("single");
    private static final AtomicReference<String> RECEIVED_KEY = new AtomicReference<>();
    private static final HttpServer EXTERNAL = external();
    @Autowired private MockMvc mvc;
    @Autowired private MemberRepository members;
    @Autowired private StoreRepository stores;
    @Autowired private PasswordEncoder passwords;
    private Long storeId;
    private String token;
    private int year;

    @DynamicPropertySource static void properties(DynamicPropertyRegistry registry) {
        registry.add("app.external.holiday-base-url", () -> "http://127.0.0.1:" + EXTERNAL.getAddress().getPort() + "/holiday");
    }

    @BeforeEach void setup() throws Exception {
        String loginId = "holiday" + UUID.randomUUID().toString().substring(0, 12);
        Member member = members.saveAndFlush(Member.create(loginId, passwords.encode("Holiday123!"), "공휴일테스트", "01000000000"));
        storeId = stores.saveAndFlush(Store.createVerified(member.getId(), "%09d7".formatted(member.getId()),
                "공휴일매장", "테스트", LocalDate.of(2000, 1, 1))).getId();
        token = login(loginId);
        year = YEARS.getAndIncrement(); // 매장 간 공유 캐시와 이전 테스트의 조회 월을 분리한다.
        CALLS.set(0); MODE.set("single"); RECEIVED_KEY.set(null);
    }

    @AfterAll static void stop() { EXTERNAL.stop(0); }

    @Test void ownerReadsHolidaysWithoutAnAddressAndRepeatedCallsReuseTheMonthCache() throws Exception {
        var request = get(path()).param("year", String.valueOf(year)).param("month", "12").header("Authorization", "Bearer " + token);
        String first = mvc.perform(request).andExpect(status().isOk())
                .andExpect(jsonPath("$.storeId").value(storeId)).andExpect(jsonPath("$.source").value("KASI"))
                .andExpect(jsonPath("$.mock").value(true)).andExpect(jsonPath("$.year").value(year))
                .andExpect(jsonPath("$.holidays.content[0].date").value(year + "-12-25"))
                .andExpect(jsonPath("$.holidays.content[0].name").value("테스트 공휴일"))
                .andExpect(jsonPath("$.holidays.totalElements").value(1)).andReturn().getResponse().getContentAsString();
        String second = mvc.perform(request).andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        assertThat(JSON.readTree(first).get("fetchedAt")).isEqualTo(JSON.readTree(second).get("fetchedAt"));
        assertThat(CALLS.get()).isEqualTo(1);
        assertThat(RECEIVED_KEY.get()).isEqualTo("mock-key");
        assertThat(stores.findById(storeId).orElseThrow().getAddress()).isNull();
    }

    @Test void rejectsOtherOwnersBeforeUsingAPrimedCacheAndRejectsAnonymousRequests() throws Exception {
        mvc.perform(get(path()).param("year", String.valueOf(year)).param("month", "12")
                .header("Authorization", "Bearer " + token)).andExpect(status().isOk());
        String otherId = "other" + UUID.randomUUID().toString().substring(0, 12);
        members.saveAndFlush(Member.create(otherId, passwords.encode("Holiday123!"), "다른테스트", "01000000001"));
        String otherToken = login(otherId);
        CALLS.set(0);
        mvc.perform(get(path()).param("year", String.valueOf(year)).param("month", "12")
                .header("Authorization", "Bearer " + otherToken)).andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("FORBIDDEN"));
        mvc.perform(get(path()).param("year", String.valueOf(year)).param("month", "12")).andExpect(status().isUnauthorized());
        assertThat(CALLS.get()).isZero();
    }

    @Test void returnsAnExplicitEmptyPageForASuccessfulZeroCount() throws Exception {
        MODE.set("empty");
        mvc.perform(get(path()).param("year", String.valueOf(year)).param("month", "11")
                .header("Authorization", "Bearer " + token)).andExpect(status().isOk())
                .andExpect(jsonPath("$.mock").value(true)).andExpect(jsonPath("$.fetchedAt").isNotEmpty())
                .andExpect(jsonPath("$.holidays.content").isEmpty()).andExpect(jsonPath("$.holidays.totalElements").value(0));
    }

    @Test void paginatesAndSortsTheCompleteMonthRatherThanTheProviderPage() throws Exception {
        MODE.set("multiple");
        mvc.perform(get(path()).param("year", String.valueOf(year)).param("month", "12")
                .param("size", "1").param("page", "1").param("sort", "date,desc")
                .header("Authorization", "Bearer " + token)).andExpect(status().isOk())
                .andExpect(jsonPath("$.holidays.content[0].date").value(year + "-12-24"))
                .andExpect(jsonPath("$.holidays.totalElements").value(2));
    }

    @Test void invalidParametersFailBeforeAnyUpstreamRequest() throws Exception {
        for (var parameters : List.of(Map.of("year", "999", "month", "12"), Map.of("year", "2026", "month", "13"),
                Map.of("year", "no-year", "month", "12"), Map.of("year", "2026"),
                Map.of("year", "2026", "month", "12", "sort", "unknown,desc"))) {
            var request = get(path()).header("Authorization", "Bearer " + token);
            parameters.forEach(request::param);
            mvc.perform(request).andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("INVALID_REQUEST"));
        }
        assertThat(CALLS.get()).isZero();
    }

    @Test void providerFailureIsNotZeroAndDoesNotPoisonTheCache() throws Exception {
        MODE.set("unavailable");
        String failed = mvc.perform(get(path()).param("year", String.valueOf(year)).param("month", "12")
                .header("Authorization", "Bearer " + token)).andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.code").value("HOLIDAY_UNAVAILABLE"))
                .andExpect(jsonPath("$.holidays").doesNotExist()).andReturn().getResponse().getContentAsString();
        assertThat(failed).doesNotContain("upstream-secret", "do-not-forward", "serviceKey");
        MODE.set("single");
        mvc.perform(get(path()).param("year", String.valueOf(year)).param("month", "12")
                .header("Authorization", "Bearer " + token)).andExpect(status().isOk());
        assertThat(CALLS.get()).isEqualTo(2);
    }

    @Test void publishesTheHolidayContractInSwagger() throws Exception {
        String body = mvc.perform(get("/v3/api-docs")).andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        assertThat(JSON.readTree(body).path("paths").has("/api/stores/{storeId}/home/holidays")).isTrue();
    }

    private String path() { return "/api/stores/" + storeId + "/home/holidays"; }

    private String login(String loginId) throws Exception {
        var result = mvc.perform(post("/api/auth/login").header("X-Nansogong-Auth", "1").contentType(MediaType.APPLICATION_JSON)
                .content(JSON.writeValueAsString(Map.of("loginId", loginId, "password", "Holiday123!"))))
                .andExpect(status().isOk()).andReturn();
        return JSON.readTree(result.getResponse().getContentAsByteArray()).get("accessToken").asString();
    }

    private static HttpServer external() {
        try {
            var server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
            server.createContext("/holiday/getRestDeInfo", exchange -> {
                CALLS.incrementAndGet();
                Map<String, String> query = new HashMap<>();
                for (String pair : exchange.getRequestURI().getRawQuery().split("&")) {
                    String[] parts = pair.split("=", 2);
                    query.put(parts[0], URLDecoder.decode(parts[1], StandardCharsets.UTF_8));
                }
                RECEIVED_KEY.set(query.get("serviceKey"));
                int status = MODE.get().equals("unavailable") ? 503 : 200;
                Object single = Map.of("dateName", "테스트 공휴일", "isHoliday", "Y", "locdate", query.get("solYear") + "1225", "seq", 1);
                Object items = MODE.get().equals("empty") ? "" : Map.of("item", MODE.get().equals("multiple")
                        ? List.of(single, Map.of("dateName", "다른 테스트 공휴일", "isHoliday", "Y", "locdate", query.get("solYear") + "1224", "seq", 1)) : single);
                int count = MODE.get().equals("empty") ? 0 : MODE.get().equals("multiple") ? 2 : 1;
                Object body = status == 503 ? Map.of("message", "upstream-secret") : Map.of("response", Map.of(
                        "header", Map.of("resultCode", "00"), "body", Map.of("items", items,
                                "numOfRows", 100, "pageNo", 1, "totalCount", count)));
                byte[] bytes = JSON.writeValueAsBytes(body);
                exchange.getResponseHeaders().set("Content-Type", "application/json; charset=utf-8");
                exchange.sendResponseHeaders(status, bytes.length);
                try (var output = exchange.getResponseBody()) { output.write(bytes); }
                exchange.close();
            });
            server.start(); return server;
        } catch (IOException error) { throw new IllegalStateException(error); }
    }
}
