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
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsInAnyOrder;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** 임시 DB 로그인 → 주소 저장 → 가짜 카카오·TourAPI HTTP → 권한·거리·기간·캐시·Swagger. */
@SpringBootTest(properties = {"app.external.data-go-kr-service-key=never-forward-real-key",
        "app.external.kakao-rest-api-key=never-forward-real-kakao", "app.verification.mode=mock"})
@AutoConfigureMockMvc
@Import(TestcontainersConfig.class)
class HomeEventFlowTest {
    private static final JsonMapper JSON = JsonMapper.builder().build();
    private static final AtomicInteger YEARS = new AtomicInteger(2040);
    private static final AtomicInteger TOUR_CALLS = new AtomicInteger();
    private static final AtomicInteger KAKAO_CALLS = new AtomicInteger();
    private static final AtomicReference<String> MODE = new AtomicReference<>("normal");
    private static final AtomicReference<String> KEY = new AtomicReference<>();
    private static final AtomicReference<String> AUTH = new AtomicReference<>();
    private static final HttpServer EXTERNAL = external();
    @Autowired private MockMvc mvc;
    @Autowired private MemberRepository members;
    @Autowired private StoreRepository stores;
    @Autowired private PasswordEncoder passwords;
    private Long storeId;
    private String token;
    private int year;

    @DynamicPropertySource static void properties(DynamicPropertyRegistry registry) {
        registry.add("app.external.kakao-base-url", () -> base() + "/kakao");
        registry.add("app.external.tour-base-url", () -> base() + "/tour");
    }

    @BeforeEach void setup() throws Exception {
        String loginId = "event" + UUID.randomUUID().toString().substring(0, 12);
        Member member = members.saveAndFlush(Member.create(loginId, passwords.encode("Events123!"), "행사테스트", "01000000000"));
        storeId = stores.saveAndFlush(Store.createVerified(member.getId(), "%09d5".formatted(member.getId()),
                "행사매장", "테스트", LocalDate.of(2000, 1, 1))).getId();
        token = login(loginId);
        year = YEARS.getAndIncrement();
        TOUR_CALLS.set(0); KAKAO_CALLS.set(0); MODE.set("normal"); KEY.set(null); AUTH.set(null);
    }

    @AfterAll static void stop() { EXTERNAL.stop(0); }

    @Test void ownerReadsOnlyNearbyEventsAndOverlappingPeriodsWithReusableCaches() throws Exception {
        saveAddress("서울 중구 세종대로 110 " + UUID.randomUUID());
        var request = get(path()).param("year", String.valueOf(year)).param("month", "12").header("Authorization", "Bearer " + token);
        mvc.perform(request).andExpect(status().isOk()).andExpect(jsonPath("$.source").value("TOUR_API"))
                .andExpect(jsonPath("$.mock").value(true)).andExpect(jsonPath("$.radiusMeters").value(3000))
                .andExpect(jsonPath("$.events.totalElements").value(2)).andExpect(jsonPath("$.unlocatedEventCount").value(1))
                .andExpect(jsonPath("$.events.content[*].externalId", containsInAnyOrder("1", "2")));
        mvc.perform(request).andExpect(status().isOk());
        assertThat(KAKAO_CALLS.get()).isEqualTo(1);
        assertThat(TOUR_CALLS.get()).isEqualTo(1);
        assertThat(KEY.get()).isEqualTo("mock-key");
        assertThat(AUTH.get()).isEqualTo("KakaoAK mock-key");
    }

    @Test void otherOwnerIsRejectedBeforeUsingCachesAndAnonymousRequestsAreRejected() throws Exception {
        saveAddress("서울 중구 세종대로 110 " + UUID.randomUUID());
        mvc.perform(request()).andExpect(status().isOk());
        String other = "other" + UUID.randomUUID().toString().substring(0, 12);
        members.saveAndFlush(Member.create(other, passwords.encode("Events123!"), "다른테스트", "01000000001"));
        String otherToken = login(other);
        TOUR_CALLS.set(0); KAKAO_CALLS.set(0);
        mvc.perform(get(path()).param("year", String.valueOf(year)).param("month", "12").header("Authorization", "Bearer " + otherToken))
                .andExpect(status().isForbidden()).andExpect(jsonPath("$.code").value("FORBIDDEN"));
        mvc.perform(get(path()).param("year", String.valueOf(year)).param("month", "12")).andExpect(status().isUnauthorized());
        assertThat(TOUR_CALLS.get()).isZero(); assertThat(KAKAO_CALLS.get()).isZero();
    }

    @Test void savedAddressChangesRecalculateDistanceWhileSharingOnlyTheNationwideSource() throws Exception {
        saveAddress("서울 중구 세종대로 110 " + UUID.randomUUID());
        mvc.perform(request()).andExpect(status().isOk()).andExpect(jsonPath("$.events.totalElements").value(2));
        saveAddress("부산 연제구 중앙대로 1001 " + UUID.randomUUID());
        mvc.perform(request()).andExpect(status().isOk()).andExpect(jsonPath("$.events.totalElements").value(1))
                .andExpect(jsonPath("$.events.content[0].externalId").value("3"));
        assertThat(TOUR_CALLS.get()).isEqualTo(1);
        assertThat(KAKAO_CALLS.get()).isEqualTo(2);
    }

    @Test void missingAddressFailsWithoutAnyExternalCall() throws Exception {
        mvc.perform(request()).andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("STORE_ADDRESS_REQUIRED"));
        assertThat(TOUR_CALLS.get()).isZero(); assertThat(KAKAO_CALLS.get()).isZero();
    }

    @Test void validatesParametersBeforeCallingProviders() throws Exception {
        for (var params : List.of(Map.of("year", "999", "month", "12"), Map.of("year", "2026", "month", "13"),
                Map.of("year", "oops", "month", "12"), Map.of("year", "2026"),
                Map.of("year", "2026", "month", "12", "radiusMeters", "0"),
                Map.of("year", "2026", "month", "12", "radiusMeters", "20001"),
                Map.of("year", "2026", "month", "12", "sort", "unknown,desc"))) {
            var request = get(path()).header("Authorization", "Bearer " + token); params.forEach(request::param);
            mvc.perform(request).andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("INVALID_REQUEST"));
        }
        assertThat(TOUR_CALLS.get()).isZero(); assertThat(KAKAO_CALLS.get()).isZero();
    }

    @Test void onlyAnExplicitSuccessfulZeroBecomesAnEmptyPage() throws Exception {
        saveAddress("서울 중구 세종대로 110 " + UUID.randomUUID());
        MODE.set("empty");
        mvc.perform(request()).andExpect(status().isOk()).andExpect(jsonPath("$.events.totalElements").value(0))
                .andExpect(jsonPath("$.events.content").isEmpty()).andExpect(jsonPath("$.fetchedAt").isNotEmpty());
    }

    @Test void providerFailureDoesNotBecomeZeroOrPoisonTheCache() throws Exception {
        saveAddress("서울 중구 세종대로 110 " + UUID.randomUUID());
        MODE.set("failure");
        String body = mvc.perform(request()).andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.code").value("EVENT_UNAVAILABLE")).andExpect(jsonPath("$.events").doesNotExist())
                .andReturn().getResponse().getContentAsString();
        assertThat(body).doesNotContain("upstream-secret", "never-forward", "serviceKey");
        MODE.set("normal");
        mvc.perform(request()).andExpect(status().isOk());
        assertThat(TOUR_CALLS.get()).isEqualTo(2);
    }

    @Test void paginatesAfterDistanceFilteringAndPublishesSwaggerContract() throws Exception {
        saveAddress("서울 중구 세종대로 110 " + UUID.randomUUID());
        mvc.perform(request().param("size", "1").param("page", "1").param("sort", "distanceMeters,asc"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.events.totalElements").value(2))
                .andExpect(jsonPath("$.events.content[0].externalId").value("2"));
        String docs = mvc.perform(get("/v3/api-docs")).andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        assertThat(JSON.readTree(docs).path("paths").has("/api/stores/{storeId}/home/local-events")).isTrue();
    }

    private org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder request() {
        return get(path()).param("year", String.valueOf(year)).param("month", "12").header("Authorization", "Bearer " + token);
    }

    private void saveAddress(String address) throws Exception {
        mvc.perform(put("/api/stores/" + storeId).header("Authorization", "Bearer " + token).contentType(MediaType.APPLICATION_JSON)
                .content(JSON.writeValueAsString(Map.of("name", "행사매장", "category", "카페", "address", address,
                        "openTime", "09:00", "closeTime", "18:00", "closedDays", List.of())))).andExpect(status().isOk());
    }

    private String login(String id) throws Exception {
        var result = mvc.perform(post("/api/auth/login").header("X-Nansogong-Auth", "1").contentType(MediaType.APPLICATION_JSON)
                .content(JSON.writeValueAsString(Map.of("loginId", id, "password", "Events123!"))))
                .andExpect(status().isOk()).andReturn();
        return JSON.readTree(result.getResponse().getContentAsByteArray()).get("accessToken").asString();
    }

    private String path() { return "/api/stores/" + storeId + "/home/local-events"; }
    private static String base() { return "http://127.0.0.1:" + EXTERNAL.getAddress().getPort(); }

    private static HttpServer external() {
        try {
            var server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
            server.createContext("/kakao/v2/local/search/address.json", exchange -> {
                KAKAO_CALLS.incrementAndGet(); AUTH.set(exchange.getRequestHeaders().getFirst("Authorization"));
                boolean busan = query(exchange.getRequestURI().getRawQuery()).get("query").contains("부산");
                byte[] bytes = JSON.writeValueAsBytes(Map.of("meta", Map.of("total_count", 1), "documents", List.of(Map.of(
                        "x", busan ? "129.0756" : "126.9779", "y", busan ? "35.1796" : "37.5664"))));
                exchange.getResponseHeaders().set("Content-Type", "application/json; charset=utf-8");
                exchange.sendResponseHeaders(200, bytes.length);
                try (var output = exchange.getResponseBody()) { output.write(bytes); }
                exchange.close();
            });
            server.createContext("/tour/searchFestival2", exchange -> {
                TOUR_CALLS.incrementAndGet();
                Map<String, String> query = query(exchange.getRequestURI().getRawQuery()); KEY.set(query.get("serviceKey"));
                var first = LocalDate.parse(query.get("eventStartDate"), DateTimeFormatter.BASIC_ISO_DATE);
                var month = YearMonth.from(first);
                var rows = MODE.get().equals("empty") ? List.of() : List.of(
                        row("1", first, month.atEndOfMonth(), "126.9779", "37.5664"),
                        row("2", first.minusMonths(1), month.atEndOfMonth().plusDays(10), "126.9767", "37.5716"),
                        row("3", first, month.atEndOfMonth(), "129.0756", "35.1796"),
                        row("4", first, month.atEndOfMonth(), "", ""));
                int status = MODE.get().equals("failure") ? 503 : 200;
                Object body = status == 503 ? Map.of("secret", "upstream-secret") : Map.of("response", Map.of(
                        "header", Map.of("resultCode", "0000", "resultMsg", "OK"), "body", Map.of("items", Map.of("item", rows),
                                "numOfRows", 1000, "pageNo", 1, "totalCount", rows.size())));
                byte[] bytes = JSON.writeValueAsBytes(body);
                exchange.getResponseHeaders().set("Content-Type", "application/json; charset=utf-8");
                exchange.sendResponseHeaders(status, bytes.length);
                try (var output = exchange.getResponseBody()) { output.write(bytes); }
                exchange.close();
            });
            server.start(); return server;
        } catch (IOException error) { throw new IllegalStateException(error); }
    }

    private static Map<String, Object> row(String id, LocalDate start, LocalDate end, String x, String y) {
        return Map.of("contentid", id, "contenttypeid", "15", "title", "행사 " + id, "eventstartdate", start.format(DateTimeFormatter.BASIC_ISO_DATE),
                "eventenddate", end.format(DateTimeFormatter.BASIC_ISO_DATE), "addr1", "예시 장소", "mapx", x, "mapy", y);
    }

    private static Map<String, String> query(String raw) {
        var result = new HashMap<String, String>();
        for (String part : raw.split("&")) {
            String[] pair = part.split("=", 2); result.put(pair[0], URLDecoder.decode(pair[1], StandardCharsets.UTF_8));
        }
        return result;
    }
}
