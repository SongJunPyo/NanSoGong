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
import org.springframework.test.web.servlet.ResultActions;
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

/** API → 공용 RestClient → 가짜 국세청의 진위확인 흐름. 실제 개인정보·국세청은 사용하지 않는다. */
@SpringBootTest(properties = {"app.external.data-go-kr-service-key=test+key/value=="})
@AutoConfigureMockMvc
@Import(TestcontainersConfig.class)
class AuthBusinessVerificationFlowTest {

    private static final String REQUEST = """
            {"bizRegNo":"1234567890","ownerName":"테스트대표","openingDate":"20000101"}
            """;
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
            server.createContext("/nts/v1/validate", exchange -> {
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
        RESPONSE.set(validResponse("01"));
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
    void verifiesIdentityAndBusinessStatus(String ntsStatus, String expected) throws Exception {
        RESPONSE.set(validResponse(ntsStatus));
        verify(REQUEST).andExpect(status().isOk())
                .andExpect(jsonPath("$.bizRegNo").value("1234567890"))
                .andExpect(jsonPath("$.status").value(expected))
                .andExpect(jsonPath("$.ownerName").doesNotExist())
                .andExpect(jsonPath("$.verificationToken").doesNotExist());

        assertThat(REQUEST_COUNT.get()).isEqualTo(1);
        assertThat(REQUEST_METHOD.get()).isEqualTo("POST");
        var body = JsonMapper.builder().build().readTree(REQUEST_BODY.get());
        assertThat(body.size()).isEqualTo(1);
        assertThat(body.get("businesses").size()).isEqualTo(1);
        var business = body.get("businesses").get(0);
        assertThat(business.size()).isEqualTo(3);
        assertThat(business.get("b_no").asString()).isEqualTo("1234567890");
        assertThat(business.get("start_dt").asString()).isEqualTo("20000101");
        assertThat(business.get("p_nm").asString()).isEqualTo("테스트대표");
        assertThat(REQUEST_QUERY.get()).contains("serviceKey=test%2Bkey%2Fvalue%3D%3D", "returnType=JSON");
    }

    @Test
    void acceptsTheObservedUnverifiableResponseWithoutStatusOrValidCount() throws Exception {
        RESPONSE.set("""
                {"request_cnt":1,"status_code":"OK","data":[{
                  "b_no":"0000000000","valid":"02","valid_msg":"확인할 수 없습니다.",
                  "request_param":{"b_no":"0000000000","start_dt":"20000101","p_nm":"테스트대표"}}]}
                """);
        verify(REQUEST.replace("1234567890", "0000000000"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("MISMATCH"));
        assertThat(REQUEST_COUNT.get()).isEqualTo(1); // /status로 재조회해 성공 처리하지 않는다.
    }

    @Test
    void unverifiableIdentityCannotBeOverriddenByAnActiveStatus() throws Exception {
        RESPONSE.set(validResponse("01").replace("\"valid\":\"01\"", "\"valid\":\"02\"")
                .replace("\"valid_cnt\":1", "\"valid_cnt\":0"));
        verify(REQUEST).andExpect(status().isOk()).andExpect(jsonPath("$.status").value("MISMATCH"));
    }

    @ParameterizedTest
    @ValueSource(strings = {"{}", "{", "{\"bizRegNo\":\"1234567890\"}",
            "{\"bizRegNo\":\"123\",\"ownerName\":\"테스트대표\",\"openingDate\":\"20000101\"}",
            "{\"bizRegNo\":\"1234567890\",\"ownerName\":\"  \",\"openingDate\":\"20000101\"}",
            "{\"bizRegNo\":\"1234567890\",\"ownerName\":\"테스트대표\",\"openingDate\":\"2000-01-01\"}",
            "{\"bizRegNo\":\"1234567890\",\"ownerName\":\"테스트대표\",\"openingDate\":\"20000230\"}"})
    void rejectsInvalidInputBeforeCallingNts(String request) throws Exception {
        verify(request).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_BUSINESS_INFORMATION"));
        assertThat(REQUEST_COUNT.get()).isZero();
    }

    @Test
    void trimsTheRepresentativeNameAndAcceptsALeapDay() throws Exception {
        RESPONSE.set(validResponse("01").replace("20000101", "20000229"));
        verify(REQUEST.replace("20000101", "20000229").replace("테스트대표", "  테스트대표  "))
                .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("ACTIVE"));
    }

    @ParameterizedTest
    @ValueSource(strings = {"null", "{}", "{\"request_cnt\":1,\"status_code\":\"OK\",\"data\":[]}",
            "{\"request_cnt\":1,\"status_code\":\"OK\",\"data\":[null]}"})
    void missingResultsNeverBecomeSuccessfulVerifications(String response) throws Exception {
        RESPONSE.set(response);
        expectInvalidResponse();
    }

    @ParameterizedTest
    @CsvSource({"status_code, OK, ERROR", "valid, 01, 99", "valid_cnt, 1, 0",
            "b_no, 1234567890, 9999999999", "start_dt, 20000101, 19990101", "p_nm, 테스트대표, 다른대표", "b_stt_cd, 01, 99"})
    void rejectsContradictoryOrDifferentIdentityResponses(String field, String from, String to) throws Exception {
        String original = field.equals("valid_cnt") ? "\"valid_cnt\":" + from : "\"%s\":\"%s\"".formatted(field, from);
        String replacement = field.equals("valid_cnt") ? "\"valid_cnt\":" + to : "\"%s\":\"%s\"".formatted(field, to);
        RESPONSE.set(validResponse("01").replace(original, replacement));
        expectInvalidResponse();
    }

    @ParameterizedTest
    @ValueSource(strings = {"request_param", "status"})
    void validFlagRequiresBothTheMatchingRequestAndBusinessStatus(String field) throws Exception {
        var response = JsonMapper.builder().build().readTree(validResponse("01"));
        ((tools.jackson.databind.node.ObjectNode) response.get("data").get(0)).remove(field);
        RESPONSE.set(response.toString());
        expectInvalidResponse();
    }

    @ParameterizedTest
    @ValueSource(ints = {401, 429, 503, -1})
    void externalFailuresDoNotLeakUpstreamDetails(int upstreamStatus) throws Exception {
        RESPONSE_STATUS.set(upstreamStatus);
        RESPONSE.set("{\"message\":\"test+key/value== 민감한 외부 상세\"}");
        String body = verify(REQUEST).andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.code").value("NTS_UNAVAILABLE"))
                .andExpect(jsonPath("$.status").doesNotExist())
                .andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8);
        assertThat(body).doesNotContain("serviceKey", "test+key", "민감한 외부 상세", "테스트대표");
    }

    @Test
    void malformedJsonIsAFailure() throws Exception {
        RESPONSE.set("not-json");
        verify(REQUEST).andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.code").value("NTS_UNAVAILABLE"));
    }

    private ResultActions verify(String request) throws Exception {
        return mvc.perform(post("/api/auth/business-verifications")
                .contentType(MediaType.APPLICATION_JSON).content(request));
    }

    private void expectInvalidResponse() throws Exception {
        verify(REQUEST).andExpect(status().isBadGateway())
                .andExpect(jsonPath("$.code").value("NTS_INVALID_RESPONSE"))
                .andExpect(jsonPath("$.status").doesNotExist());
    }

    private static String validResponse(String status) {
        return """
                {"request_cnt":1,"valid_cnt":1,"status_code":"OK","data":[{
                  "b_no":"1234567890","valid":"01",
                  "request_param":{"b_no":"1234567890","start_dt":"20000101","p_nm":"테스트대표"},
                  "status":{"b_no":"1234567890","b_stt_cd":"%s","end_dt":""}}]}
                """.formatted(status);
    }
}
