package com.nansogong;

import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import tools.jackson.databind.json.JsonMapper;

import java.io.IOException;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** HTTP API → 공용 RestClient → 가짜 국세청 HTTP 서버 흐름을 검증한다. 실제 국세청은 호출하지 않는다. */
@SpringBootTest(properties = {"app.external.data-go-kr-service-key=test+key/value=="})
@AutoConfigureMockMvc
@Import(TestcontainersConfig.class)
class AuthBusinessStatusFlowTest {

    private static final AtomicReference<String> RESPONSE = new AtomicReference<>();
    private static final AtomicInteger RESPONSE_STATUS = new AtomicInteger(200);
    private static final AtomicInteger REQUEST_COUNT = new AtomicInteger();
    private static final AtomicReference<String> REQUEST_BODY = new AtomicReference<>();
    private static final AtomicReference<String> REQUEST_QUERY = new AtomicReference<>();
    private static final AtomicReference<String> REQUEST_METHOD = new AtomicReference<>();
    private static final HttpServer NTS = startNts();

    @Autowired
    private MockMvc mvc;

    @DynamicPropertySource
    static void ntsProperties(DynamicPropertyRegistry registry) {
        registry.add("app.external.nts-base-url", () -> "http://127.0.0.1:" + NTS.getAddress().getPort() + "/nts/v1");
    }

    private static HttpServer startNts() {
        try {
            HttpServer server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
            server.createContext("/nts/v1/status", exchange -> {
                REQUEST_COUNT.incrementAndGet();
                REQUEST_BODY.set(new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8));
                REQUEST_QUERY.set(exchange.getRequestURI().getRawQuery());
                REQUEST_METHOD.set(exchange.getRequestMethod());
                if (RESPONSE_STATUS.get() == -1) {
                    exchange.close();
                    return;
                }
                byte[] body = RESPONSE.get().getBytes(StandardCharsets.UTF_8);
                exchange.getResponseHeaders().set("Content-Type", "application/json; charset=utf-8");
                exchange.sendResponseHeaders(RESPONSE_STATUS.get(), body.length);
                try (var output = exchange.getResponseBody()) {
                    output.write(body);
                }
                exchange.close();
            });
            server.start();
            return server;
        } catch (IOException e) {
            throw new IllegalStateException("테스트용 국세청 서버를 시작할 수 없습니다", e);
        }
    }

    @BeforeEach
    void resetNts() {
        RESPONSE_STATUS.set(200);
        RESPONSE.set(response("01"));
        REQUEST_COUNT.set(0);
        REQUEST_BODY.set(null);
        REQUEST_QUERY.set(null);
    }

    @AfterAll
    static void stopNts() {
        NTS.stop(0);
    }

    @ParameterizedTest
    @CsvSource({"01, ACTIVE", "02, SUSPENDED", "03, CLOSED"})
    void looksUpBusinessStatusWithoutLogin(String ntsCode, String expectedStatus) throws Exception {
        RESPONSE.set(response(ntsCode));

        mvc.perform(post("/api/auth/business-status")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"bizRegNo\":\"1234567890\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.bizRegNo").value("1234567890"))
                .andExpect(jsonPath("$.status").value(expectedStatus))
                .andExpect(jsonPath("$.verificationToken").doesNotExist());

        assertThat(REQUEST_COUNT.get()).isEqualTo(1);
        assertThat(REQUEST_METHOD.get()).isEqualTo("POST");
        assertThat(JsonMapper.builder().build().readTree(REQUEST_BODY.get()).get("b_no").get(0).asString())
                .isEqualTo("1234567890");
        assertThat(REQUEST_QUERY.get()).contains("serviceKey=test%2Bkey%2Fvalue%3D%3D", "returnType=JSON");
    }

    @Test
    void unregisteredNumberIsNotACommunicationFailure() throws Exception {
        RESPONSE.set("""
                {"request_cnt":1,"status_code":"OK","data":[{
                  "b_no":"0000000000","b_stt_cd":"","tax_type_cd":"",
                  "tax_type":"국세청에 등록되지 않은 사업자등록번호입니다."}]}
                """);

        mvc.perform(post("/api/auth/business-status")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"bizRegNo\":\"0000000000\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("NOT_FOUND"));
    }

    @ParameterizedTest
    @ValueSource(strings = {"{}", "{\"bizRegNo\":null}", "{\"bizRegNo\":\"\"}",
            "{\"bizRegNo\":\"123-45-67890\"}", "{\"bizRegNo\":\"12345abcde\"}", "{"})
    void rejectsInvalidInputBeforeCallingNts(String request) throws Exception {
        mvc.perform(post("/api/auth/business-status").contentType(MediaType.APPLICATION_JSON).content(request))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_BUSINESS_NUMBER"));
        assertThat(REQUEST_COUNT.get()).isZero();
    }

    @ParameterizedTest
    @ValueSource(ints = {401, 429, 503})
    void upstreamErrorsAreFailuresWithoutLeakingSecrets(int upstreamStatus) throws Exception {
        RESPONSE_STATUS.set(upstreamStatus);
        RESPONSE.set("{\"message\":\"upstream detail test+key/value==\"}");

        String body = mvc.perform(post("/api/auth/business-status")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"bizRegNo\":\"1234567890\"}"))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.code").value("NTS_UNAVAILABLE"))
                .andExpect(jsonPath("$.status").doesNotExist())
                .andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8);
        assertThat(body).doesNotContain("test+key", "upstream detail", "serviceKey");
    }

    @ParameterizedTest
    @ValueSource(strings = {"null", "{}", "{\"request_cnt\":1,\"status_code\":\"OK\",\"data\":[]}",
            "{\"request_cnt\":1,\"status_code\":\"ERROR\",\"data\":[]}",
            "{\"request_cnt\":1,\"status_code\":\"OK\",\"data\":[null]}"})
    void incompleteResponsesNeverBecomeSuccessfulChecks(String response) throws Exception {
        RESPONSE.set(response);
        expectInvalidResponse();
    }

    @ParameterizedTest
    @ValueSource(strings = {"99", ""})
    void unknownStatusIsNotAnActiveBusiness(String code) throws Exception {
        RESPONSE.set(response(code));
        expectInvalidResponse();
    }

    @Test
    void rejectsAResponseForAnotherBusiness() throws Exception {
        RESPONSE.set(response("01").replace("1234567890", "9999999999"));
        expectInvalidResponse();
    }

    @Test
    void malformedJsonIsAQueryFailure() throws Exception {
        RESPONSE.set("not-json");
        mvc.perform(post("/api/auth/business-status")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"bizRegNo\":\"1234567890\"}"))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.code").value("NTS_UNAVAILABLE"));
    }

    @Test
    void disconnectedNtsIsNotARegisteredBusiness() throws Exception {
        RESPONSE_STATUS.set(-1);
        mvc.perform(post("/api/auth/business-status")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"bizRegNo\":\"1234567890\"}"))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.code").value("NTS_UNAVAILABLE"))
                .andExpect(jsonPath("$.status").doesNotExist());
    }

    private void expectInvalidResponse() throws Exception {
        mvc.perform(post("/api/auth/business-status")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"bizRegNo\":\"1234567890\"}"))
                .andExpect(status().isBadGateway())
                .andExpect(jsonPath("$.code").value("NTS_INVALID_RESPONSE"))
                .andExpect(jsonPath("$.status").doesNotExist());
    }

    private static String response(String code) {
        // 기존 WireMock과 같은 정상 응답. 사용하지 않는 국세청 필드도 허용한다.
        return """
                {"request_cnt":1,"match_cnt":1,"status_code":"OK","data":[{
                  "b_no":"1234567890","b_stt_cd":"%s","tax_type_cd":"01",
                  "tax_type":"부가가치세 일반과세자","end_dt":"","rbf_tax_type_cd":"99"}]}
                """.formatted(code);
    }
}
