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
import org.springframework.jdbc.core.JdbcTemplate;
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
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** 실제 테스트 DB 주소 저장 → 로그인 JWT → 카카오·기상청 가짜 HTTP 서버 → 날씨·Swagger 응답. */
@SpringBootTest(properties = {"app.external.kakao-rest-api-key=do-not-forward-real-kakao-key",
        "app.external.kma-service-key=do-not-forward-real-kma-key", "app.verification.mode=mock"})
@AutoConfigureMockMvc
@Import(TestcontainersConfig.class)
class WeatherFlowTest {
    private static final JsonMapper JSON = JsonMapper.builder().build();
    private static final AtomicInteger KAKAO_CALLS = new AtomicInteger();
    private static final AtomicInteger KMA_CALLS = new AtomicInteger();
    private static final AtomicReference<String> KAKAO_AUTH = new AtomicReference<>();
    private static final AtomicReference<String> KMA_KEY = new AtomicReference<>();
    private static final HttpServer EXTERNAL = startExternal();
    @Autowired private MockMvc mvc;
    @Autowired private JdbcTemplate jdbc;
    @Autowired private MemberRepository members;
    @Autowired private StoreRepository stores;
    @Autowired private PasswordEncoder passwords;
    private Member owner;
    private Store store;
    private String token;

    @DynamicPropertySource static void properties(DynamicPropertyRegistry registry) {
        registry.add("app.external.kakao-base-url", () -> base() + "/kakao");
        registry.add("app.external.kma-base-url", () -> base() + "/kma");
    }
    private static String base() { return "http://127.0.0.1:" + EXTERNAL.getAddress().getPort(); }

    @BeforeEach void setup() throws Exception {
        jdbc.execute("TRUNCATE TABLE member CASCADE"); // Testcontainers 전용. 공용 DB·로컬 앱 DB와 분리.
        owner = members.saveAndFlush(Member.create("weatherowner", passwords.encode("Weather123!"), "테스트", "01000000000"));
        store = stores.saveAndFlush(Store.createVerified(owner.getId(), "1234567890", "날씨매장", "테스트", LocalDate.of(2000, 1, 1)));
        token = login("weatherowner");
        KAKAO_CALLS.set(0); KMA_CALLS.set(0);
    }

    @AfterAll static void stop() { EXTERNAL.stop(0); }

    @Test void readsSavedAddressAndReturnsWeatherThenReusesCachesWithoutChangingTheDb() throws Exception {
        saveAddress("서울 중구 세종대로 110 " + UUID.randomUUID());
        mvc.perform(get(path()).header("Authorization", "Bearer " + token)).andExpect(status().isOk())
                .andExpect(jsonPath("$.storeId").value(store.getId())).andExpect(jsonPath("$.mock").value(true))
                .andExpect(jsonPath("$.forecast.nx").value(60)).andExpect(jsonPath("$.forecast.ny").value(127))
                .andExpect(jsonPath("$.forecast.temperatureC").value(6)).andExpect(jsonPath("$.forecast.kind").value("FORECAST"))
                .andExpect(jsonPath("$.forecast.sky").value("CLEAR")).andExpect(jsonPath("$.forecast.precipitationProbability").value(0));
        int kmaCalls = KMA_CALLS.get();
        mvc.perform(get(path()).header("Authorization", "Bearer " + token)).andExpect(status().isOk());
        assertThat(KAKAO_CALLS.get()).isEqualTo(1);
        assertThat(KMA_CALLS.get()).isEqualTo(kmaCalls);
        assertThat(KAKAO_AUTH.get()).isEqualTo("KakaoAK mock-key");
        assertThat(KMA_KEY.get()).isEqualTo("mock-key");
        assertThat(stores.findById(store.getId()).orElseThrow().getAddress()).startsWith("서울 중구 세종대로 110");
    }

    @Test void rejectsAnotherOwnerBeforeCallingExternalServicesEvenForACachedLocation() throws Exception {
        saveAddress("서울 중구 세종대로 110");
        mvc.perform(get(path()).header("Authorization", "Bearer " + token)).andExpect(status().isOk());
        members.saveAndFlush(Member.create("otherowner", passwords.encode("Weather123!"), "다른테스트", "01000000001"));
        String other = login("otherowner");
        KAKAO_CALLS.set(0); KMA_CALLS.set(0);
        mvc.perform(get(path()).header("Authorization", "Bearer " + other)).andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("FORBIDDEN"));
        assertThat(KAKAO_CALLS.get()).isZero(); assertThat(KMA_CALLS.get()).isZero();
        mvc.perform(get(path())).andExpect(status().isUnauthorized());
    }

    @Test void requiresTheStoreAddressWithoutInventingADefaultLocation() throws Exception {
        mvc.perform(get(path()).header("Authorization", "Bearer " + token)).andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("STORE_ADDRESS_REQUIRED"));
        assertThat(KAKAO_CALLS.get()).isZero(); assertThat(KMA_CALLS.get()).isZero();
    }

    @Test void reportsAnUnresolvableAddressInsteadOfUsingSeoul() throws Exception {
        saveAddress("NOT_FOUND_SAMPLE");
        mvc.perform(get(path()).header("Authorization", "Bearer " + token)).andExpect(status().is(422))
                .andExpect(jsonPath("$.code").value("STORE_ADDRESS_NOT_FOUND"));
        assertThat(KMA_CALLS.get()).isZero();
    }

    @Test void reportsAnAmbiguousAddressWithoutChoosingTheFirstCandidate() throws Exception {
        saveAddress("AMBIGUOUS_SAMPLE");
        mvc.perform(get(path()).header("Authorization", "Bearer " + token)).andExpect(status().is(422))
                .andExpect(jsonPath("$.code").value("STORE_ADDRESS_AMBIGUOUS"));
        assertThat(KMA_CALLS.get()).isZero();
    }

    @Test void upstreamFailureReturnsASafeErrorWithoutWeatherOrCredentials() throws Exception {
        saveAddress("UNAVAILABLE_SAMPLE");
        var response = mvc.perform(get(path()).header("Authorization", "Bearer " + token)).andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.code").value("WEATHER_LOCATION_UNAVAILABLE"))
                .andExpect(jsonPath("$.forecast").doesNotExist()).andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8);
        assertThat(response).doesNotContain("do-not-forward", "upstream-secret", "Authorization", "UNAVAILABLE_SAMPLE");
    }

    @Test void publishesTheWeatherContractInSwagger() throws Exception {
        var body = mvc.perform(get("/v3/api-docs")).andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        assertThat(JSON.readTree(body).get("paths").has("/api/stores/{storeId}/weather")).isTrue();
    }

    private String path() { return "/api/stores/" + store.getId() + "/weather"; }
    private void saveAddress(String address) throws Exception {
        mvc.perform(put("/api/stores/" + store.getId()).header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON).content(JSON.writeValueAsString(Map.of("name", "날씨매장", "category", "카페", "address", address,
                        "openTime", "09:00", "closeTime", "22:00", "closedDays", List.of())))).andExpect(status().isOk());
    }
    private String login(String id) throws Exception {
        var response = mvc.perform(post("/api/auth/login").header("X-Nansogong-Auth", "1").contentType(MediaType.APPLICATION_JSON)
                .content(JSON.writeValueAsString(Map.of("loginId", id, "password", "Weather123!")))).andExpect(status().isOk()).andReturn();
        return JSON.readTree(response.getResponse().getContentAsByteArray()).get("accessToken").asString();
    }

    private static HttpServer startExternal() {
        try {
            var server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
            server.createContext("/", exchange -> {
                Map<String, String> query = new HashMap<>();
                for (String pair : exchange.getRequestURI().getRawQuery().split("&")) {
                    String[] parts = pair.split("=", 2);
                    query.put(parts[0], URLDecoder.decode(parts[1], StandardCharsets.UTF_8));
                }
                Object body;
                int status = 200;
                if (exchange.getRequestURI().getPath().startsWith("/kakao")) {
                    KAKAO_CALLS.incrementAndGet(); KAKAO_AUTH.set(exchange.getRequestHeaders().getFirst("Authorization"));
                    if ("UNAVAILABLE_SAMPLE".equals(query.get("query"))) {
                        status = 503; body = Map.of("message", "upstream-secret");
                    } else {
                        int count = "NOT_FOUND_SAMPLE".equals(query.get("query")) ? 0 : "AMBIGUOUS_SAMPLE".equals(query.get("query")) ? 2 : 1;
                        var document = Map.of("x", "126.977918351844", "y", "37.566370776634");
                        body = Map.of("meta", Map.of("total_count", count), "documents", count == 0 ? List.of() : count == 1 ? List.of(document) : List.of(document, document));
                    }
                } else {
                    KMA_CALLS.incrementAndGet(); KMA_KEY.set(query.get("serviceKey"));
                    LocalDateTime forecastAt = LocalDateTime.now(ZoneId.of("Asia/Seoul")).plusHours(1);
                    List<Map<String, Object>> rows = new ArrayList<>();
                    for (var value : Map.of("TMP", "6", "SKY", "1", "PTY", "0", "POP", "0", "PCP", "강수없음").entrySet()) {
                        rows.add(Map.of("baseDate", query.get("base_date"), "baseTime", query.get("base_time"),
                                "fcstDate", forecastAt.format(DateTimeFormatter.ofPattern("yyyyMMdd")), "fcstTime", forecastAt.format(DateTimeFormatter.ofPattern("HH00")),
                                "nx", Integer.parseInt(query.get("nx")), "ny", Integer.parseInt(query.get("ny")), "category", value.getKey(), "fcstValue", value.getValue()));
                    }
                    body = Map.of("response", Map.of("header", Map.of("resultCode", "00"), "body", Map.of("items", Map.of("item", rows), "pageNo", 1, "numOfRows", 1000, "totalCount", 5)));
                }
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
