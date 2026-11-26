package com.nansogong;

import com.nansogong.common.AppProperties;
import com.nansogong.service.AuthSmsVerificationService;
import com.nansogong.service.AuthSmsDeliveryService;
import com.nansogong.dto.AuthPhoneRequest;
import com.nansogong.model.Member;
import com.nansogong.model.Store;
import com.nansogong.repository.MemberRepository;
import com.nansogong.repository.StoreRepository;
import com.nansogong.service.AuthPhoneVerificationService;
import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.databind.json.JsonMapper;

import java.io.IOException;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CyclicBarrier;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** 서버 코드 인증 → 국세청 mock → 실제 테스트 DB 저장 → JWT 로그인 → 내 매장 조회·수정 흐름. */
@SpringBootTest(properties = {
        "app.external.data-go-kr-service-key=mock-key", "app.verification.mode=mock",
        "app.jwt.secret=TEST-ONLY-signing-secret-0123456789-0123456789"
})
@AutoConfigureMockMvc
@Import(TestcontainersConfig.class)
class AuthSignupFlowTest {
    private static final JsonMapper JSON = JsonMapper.builder().build();
    private static final AtomicReference<String> SCENARIO = new AtomicReference<>("NORMAL");
    private static final AtomicReference<Runnable> BEFORE_RESPONSE = new AtomicReference<>();
    private static final AtomicReference<CyclicBarrier> BARRIER = new AtomicReference<>();
    private static final AtomicInteger NTS_CALLS = new AtomicInteger();
    private static final ExecutorService NTS_THREADS = Executors.newCachedThreadPool();
    private static final HttpServer NTS = startNts();
    private static final String NAME = "가입테스트";
    private static final String PHONE = "01000000000";
    private static final String PASSWORD = "Owner123!";

    @Autowired private MockMvc mvc;
    @Autowired private JdbcTemplate jdbc;
    @Autowired private StringRedisTemplate redis;
    @Autowired private MemberRepository members;
    @Autowired private StoreRepository stores;
    @Autowired private PasswordEncoder passwords;
    @Autowired private AuthPhoneVerificationService phones;
    @Autowired private AppProperties props;
    @Autowired private AuthSmsVerificationService sms;
    @Autowired private org.springframework.core.env.Environment environment;

    @DynamicPropertySource
    static void externalProperties(DynamicPropertyRegistry registry) {
        registry.add("app.external.nts-base-url", () -> "http://127.0.0.1:" + NTS.getAddress().getPort() + "/nts/v1");
    }

    private static HttpServer startNts() {
        try {
            HttpServer server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
            server.setExecutor(NTS_THREADS);
            server.createContext("/nts/v1/validate", exchange -> {
                NTS_CALLS.incrementAndGet();
                var input = JSON.readTree(exchange.getRequestBody().readAllBytes()).get("businesses");
                Runnable action = BEFORE_RESPONSE.getAndSet(null);
                if (action != null) action.run();
                CyclicBarrier barrier = BARRIER.get();
                if (barrier != null) {
                    try { barrier.await(10, TimeUnit.SECONDS); }
                    catch (Exception e) { throw new IOException("테스트 동시 요청 대기 실패", e); }
                }
                boolean unavailable = "UNAVAILABLE".equals(SCENARIO.get());
                List<Map<String, Object>> data = new ArrayList<>();
                int validCount = 0;
                for (int i = 0; i < input.size(); i++) {
                    var business = input.get(i);
                    String number = business.get("b_no").asString();
                    boolean mismatch = "MISMATCH".equals(SCENARIO.get()) || ("SECOND_MISMATCH".equals(SCENARIO.get()) && i == 1);
                    Map<String, Object> result = new LinkedHashMap<>();
                    result.put("b_no", number);
                    result.put("valid", mismatch ? "02" : "01");
                    if (!mismatch) {
                        validCount++;
                        result.put("request_param", Map.of("b_no", number, "start_dt", business.get("start_dt").asString(), "p_nm", business.get("p_nm").asString()));
                        String state = "CLOSED".equals(SCENARIO.get()) ? "03" : "SUSPENDED".equals(SCENARIO.get()) ? "02" : "01";
                        result.put("status", Map.of("b_no", number, "b_stt_cd", state));
                    }
                    data.add(result);
                }
                Collections.reverse(data); // 여러 사업자의 응답 순서가 달라도 번호로 맞춰야 한다.
                byte[] body = JSON.writeValueAsBytes(Map.of("request_cnt", input.size(), "valid_cnt", validCount, "status_code", "OK", "data", data));
                exchange.getResponseHeaders().set("Content-Type", "application/json; charset=utf-8");
                exchange.sendResponseHeaders(unavailable ? 503 : 200, body.length);
                try (var output = exchange.getResponseBody()) { output.write(body); }
                exchange.close();
            });
            server.start();
            return server;
        } catch (IOException e) {
            throw new IllegalStateException(e);
        }
    }

    @BeforeEach
    void reset() {
        // Testcontainers 전용 DB·Redis다. 실행 중인 로컬 앱 데이터는 사용하지 않는다.
        jdbc.execute("TRUNCATE TABLE member CASCADE");
        try (var connection = redis.getConnectionFactory().getConnection()) { connection.serverCommands().flushDb(); }
        SCENARIO.set("NORMAL"); BEFORE_RESPONSE.set(null); BARRIER.set(null); NTS_CALLS.set(0);
    }

    @AfterAll
    static void stopNts() { NTS.stop(0); NTS_THREADS.shutdownNow(); }

    @Test
    void savesMemberAndMultipleVerifiedStoresThenLogsInAndReloadsFromDb() throws Exception {
        var input = payload("signupowner", "1000000001", "1000000002");
        signup(input).andExpect(status().isCreated()).andExpect(jsonPath("$.businessCount").value(2));
        assertThat(NTS_CALLS.get()).isEqualTo(1);
        assertThat(memberCount()).isEqualTo(1);
        assertThat(storeCount()).isEqualTo(2);
        Member member = members.findByLoginId("signupowner").orElseThrow();
        assertThat(member.getPasswordHash()).isNotEqualTo(PASSWORD);
        assertThat(passwords.matches(PASSWORD, member.getPasswordHash())).isTrue();
        assertThat(member.getPhoneVerifiedAt()).isNotNull();
        assertThat(stores.findByMemberId(member.getId())).allSatisfy(store -> {
            assertThat(store.getVerifyStatus().name()).isEqualTo("VERIFIED");
            assertThat(store.getVerifiedAt()).isNotNull();
            assertThat(store.getBusinessOpenedOn()).isEqualTo(LocalDate.of(2000, 1, 1));
        });
        String token = login("signupowner");
        mvc.perform(get("/api/me").header("Authorization", "Bearer " + token)).andExpect(status().isOk())
                .andExpect(jsonPath("$.loginId").value("signupowner")).andExpect(jsonPath("$.passwordHash").doesNotExist());
        mvc.perform(get("/api/stores").header("Authorization", "Bearer " + token)).andExpect(status().isOk())
                .andExpect(jsonPath("$.content.length()").value(2));
        mvc.perform(get("/api/stores").header("Authorization", "Bearer " + login("signupowner")))
                .andExpect(status().isOk()).andExpect(jsonPath("$.content.length()").value(2));
    }

    @Test
    void ignoresBrowserApprovalAndRechecksAtSignup() throws Exception {
        var input = payload("recheckowner", "1000000001");
        postJson("/api/auth/business-verifications", Map.of("bizRegNo", "1000000001", "ownerName", "테스트대표", "openingDate", "20000101"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("ACTIVE"));
        SCENARIO.set("MISMATCH");
        input.put("verificationToken", "forged-browser-proof");
        signup(input).andExpect(status().isBadRequest());
        assertThat(memberCount()).isZero(); assertThat(storeCount()).isZero();
        assertThat(NTS_CALLS.get()).isEqualTo(2);
        SCENARIO.set("NORMAL");
        signup(input).andExpect(status().isCreated()); // 외부 실패 때 전화 인증 증명을 소비하지 않는다.
    }

    @ParameterizedTest
    @ValueSource(strings = {"MISMATCH", "CLOSED", "SUSPENDED", "SECOND_MISMATCH", "UNAVAILABLE"})
    void neverPartiallyCreatesAnAccountWhenABusinessFails(String scenario) throws Exception {
        var input = payload("failedowner", "1000000001", "1000000002");
        SCENARIO.set(scenario);
        signup(input).andExpect(scenario.equals("UNAVAILABLE") ? status().isServiceUnavailable() : status().isBadRequest());
        assertThat(memberCount()).isZero(); assertThat(storeCount()).isZero();
    }

    @Test
    void forgedExpiredChangedAndReplayedPhoneProofsCannotCreateAccounts() throws Exception {
        var input = payload("phoneowner", "1000000001");
        String token = input.get("phoneVerificationToken").toString();
        input.put("phoneVerificationToken", "forged");
        signup(input).andExpect(status().isBadRequest());
        input.put("phoneVerificationToken", token); input.put("name", "다른이름");
        signup(input).andExpect(status().isBadRequest());
        input.put("name", NAME); input.put("phone", "01000000001");
        signup(input).andExpect(status().isBadRequest());
        input.put("phone", PHONE);
        var proof = phones.requireProof(token, NAME, PHONE);
        redis.expire(proof.key(), Duration.ZERO);
        signup(input).andExpect(status().isBadRequest());
        assertThat(NTS_CALLS.get()).isZero(); assertThat(memberCount()).isZero();
        input.put("phoneVerificationToken", phoneProof(NAME, PHONE));
        signup(input).andExpect(status().isCreated());
        input.put("loginId", "replayowner");
        signup(input).andExpect(status().isBadRequest());
        assertThat(memberCount()).isEqualTo(1);
    }

    @Test
    void checksPhoneCodeAttemptsAndNeverReusesAChallenge() throws Exception {
        String challenge = challenge(NAME, PHONE);
        for (int i = 0; i < 5; i++) confirm(challenge, "123456").andExpect(status().isBadRequest());
        confirm(challenge, "000000").andExpect(status().isBadRequest());
        String next = challenge(NAME, PHONE);
        confirm(next, "000000").andExpect(status().isOk());
        confirm(next, "000000").andExpect(status().isBadRequest());
    }

    @Test
    void refusesToSubstituteTheMockWhenRealPhoneModeIsRequested() {
        var realProps = new AppProperties(props.cors(), props.jwt(), new AppProperties.Verification(AppProperties.Verification.Mode.REAL, "000000"), props.crypto(), props.external(), props.session(), props.sens());
        var real = new AuthPhoneVerificationService(redis, realProps, sms, environment);
        assertThatThrownBy(() -> real.requestCode(new AuthPhoneRequest(NAME, PHONE)))
                .isInstanceOfSatisfying(ResponseStatusException.class, error -> assertThat(error.getStatusCode().value()).isEqualTo(503));
    }

    @Test
    void rejectsEmptyRepeatedNullAndInvalidBusinessListsBeforeExternalCalls() throws Exception {
        var input = payload("invalidowner", "1000000001");
        input.put("stores", List.of()); signup(input).andExpect(status().isBadRequest());
        input.put("stores", Collections.singletonList(null)); signup(input).andExpect(status().isBadRequest());
        input.put("stores", List.of(business("1000000001"), business("1000000001"))); signup(input).andExpect(status().isConflict());
        input.put("stores", List.of(Map.of("bizRegNo", "1000000001", "ownerName", "테스트대표", "openingDate", "20000230", "bizName", "테스트 매장")));
        signup(input).andExpect(status().isBadRequest());
        assertThat(memberCount()).isZero(); assertThat(storeCount()).isZero(); assertThat(NTS_CALLS.get()).isZero();
    }

    @Test
    void blocksDuplicateIdsAndBusinessesInOtherAccounts() throws Exception {
        signup(payload("firstowner", "1000000001")).andExpect(status().isCreated());
        int calls = NTS_CALLS.get();
        signup(payload("firstowner", "1000000002")).andExpect(status().isConflict());
        signup(payload("secondowner", "1000000001")).andExpect(status().isConflict());
        assertThat(NTS_CALLS.get()).isEqualTo(calls); assertThat(memberCount()).isEqualTo(1); assertThat(storeCount()).isEqualTo(1);
    }

    @Test
    void rollsBackMemberCreationOnALateDuplicateAndRestoresThePhoneProof() throws Exception {
        Member competitor = members.saveAndFlush(Member.create("competitor", passwords.encode(PASSWORD), NAME, PHONE));
        var input = payload("lateowner", "1000000001");
        BEFORE_RESPONSE.set(() -> stores.saveAndFlush(Store.createVerified(competitor.getId(), "1000000001", "테스트 매장", "테스트대표", LocalDate.of(2000, 1, 1))));
        signup(input).andExpect(status().isConflict());
        assertThat(members.existsByLoginId("lateowner")).isFalse();
        assertThat(memberCount()).isEqualTo(1); assertThat(storeCount()).isEqualTo(1);
        input.put("stores", List.of(business("1000000002")));
        signup(input).andExpect(status().isCreated());
        assertThat(memberCount()).isEqualTo(2); assertThat(storeCount()).isEqualTo(2);
    }

    @Test
    void concurrentSignupsForTheSameBusinessCreateOnlyOneAccountAndStore() throws Exception {
        var a = payload("racingownerA", "1000000001");
        var b = payload("racingownerB", "1000000001");
        BARRIER.set(new CyclicBarrier(2));
        try (var pool = Executors.newFixedThreadPool(2)) {
            var first = pool.submit(() -> signup(a).andReturn().getResponse().getStatus());
            var second = pool.submit(() -> signup(b).andReturn().getResponse().getStatus());
            assertThat(List.of(first.get(20, TimeUnit.SECONDS), second.get(20, TimeUnit.SECONDS))).containsExactlyInAnyOrder(201, 409);
        } finally { BARRIER.set(null); }
        assertThat(memberCount()).isEqualTo(1); assertThat(storeCount()).isEqualTo(1);
    }

    @Test
    void uniqueDatabaseConstraintAlsoProtectsWritersOutsideTheSignupService() {
        Member a = members.saveAndFlush(Member.create("firstowner", passwords.encode(PASSWORD), NAME, PHONE));
        Member b = members.saveAndFlush(Member.create("secondowner", passwords.encode(PASSWORD), NAME, PHONE));
        stores.saveAndFlush(Store.createVerified(a.getId(), "1000000001", "테스트", "테스트대표", LocalDate.of(2000, 1, 1)));
        assertThatThrownBy(() -> stores.saveAndFlush(Store.createVerified(b.getId(), "1000000001", "테스트", "테스트대표", LocalDate.of(2000, 1, 1))))
                .isInstanceOf(DataIntegrityViolationException.class);
        assertThat(storeCount()).isEqualTo(1);
    }

    @Test
    void storesBasicsPersistAndAnotherOwnerCannotReadOrChangeThem() throws Exception {
        signup(payload("firstowner", "1000000001")).andExpect(status().isCreated());
        signup(payload("secondowner", "1000000002")).andExpect(status().isCreated());
        Long storeId = stores.findByMemberId(members.findByLoginId("firstowner").orElseThrow().getId()).getFirst().getId();
        String owner = login("firstowner"), other = login("secondowner");
        String settings = JSON.writeValueAsString(Map.of("name", "완성 매장", "category", "카페", "address", "테스트 주소", "openTime", "22:00", "closeTime", "02:00", "closedDays", List.of("sun")));
        mvc.perform(put("/api/stores/" + storeId).header("Authorization", "Bearer " + owner).contentType(MediaType.APPLICATION_JSON).content(settings))
                .andExpect(status().isOk()).andExpect(jsonPath("$.openHours.mon[0]").value("22:00"))
                .andExpect(jsonPath("$.openHours.sun").doesNotExist()).andExpect(jsonPath("$.onboardingStatus.storeBasics").value(true));
        mvc.perform(get("/api/stores/" + storeId).header("Authorization", "Bearer " + login("firstowner")))
                .andExpect(status().isOk()).andExpect(jsonPath("$.name").value("완성 매장"));
        mvc.perform(get("/api/stores/" + storeId).header("Authorization", "Bearer " + other)).andExpect(status().isForbidden());
        mvc.perform(put("/api/stores/" + storeId).header("Authorization", "Bearer " + other).contentType(MediaType.APPLICATION_JSON).content(settings)).andExpect(status().isForbidden());
        mvc.perform(get("/api/stores?memberId=" + members.findByLoginId("firstowner").orElseThrow().getId()).header("Authorization", "Bearer " + other))
                .andExpect(status().isOk()).andExpect(jsonPath("$.content.length()").value(1)).andExpect(jsonPath("$.content[0].bizRegNo").value("1000000002"));
        mvc.perform(get("/api/stores")).andExpect(status().isUnauthorized());
    }

    private long memberCount() { return jdbc.queryForObject("SELECT count(*) FROM member", Long.class); }
    private long storeCount() { return jdbc.queryForObject("SELECT count(*) FROM store", Long.class); }
    private Map<String, String> business(String number) { return Map.of("bizRegNo", number, "ownerName", "테스트대표", "openingDate", "20000101", "bizName", "테스트 매장"); }
    private Map<String, Object> payload(String loginId, String... numbers) throws Exception {
        Map<String, Object> input = new LinkedHashMap<>();
        input.put("loginId", loginId); input.put("password", PASSWORD); input.put("name", NAME); input.put("phone", PHONE);
        input.put("phoneVerificationToken", phoneProof(NAME, PHONE));
        input.put("stores", java.util.Arrays.stream(numbers).map(this::business).toList());
        return input;
    }
    private String challenge(String name, String phone) throws Exception {
        var result = postJson("/api/auth/phone-verifications", Map.of("name", name, "phone", phone)).andExpect(status().isOk()).andReturn();
        return JSON.readTree(result.getResponse().getContentAsByteArray()).get("challengeId").asString();
    }
    private ResultActions confirm(String challenge, String code) throws Exception {
        return postJson("/api/auth/phone-verifications/" + challenge + "/confirmations", Map.of("name", NAME, "phone", PHONE, "code", code));
    }
    private String phoneProof(String name, String phone) throws Exception {
        var result = postJson("/api/auth/phone-verifications/" + challenge(name, phone) + "/confirmations", Map.of("name", name, "phone", phone, "code", "000000"))
                .andExpect(status().isOk()).andReturn();
        return JSON.readTree(result.getResponse().getContentAsByteArray()).get("verificationToken").asString();
    }
    private String login(String loginId) throws Exception {
        var result = postJson("/api/auth/login", Map.of("loginId", loginId, "password", PASSWORD)).andExpect(status().isOk()).andReturn();
        return JSON.readTree(result.getResponse().getContentAsByteArray()).get("accessToken").asString();
    }
    private ResultActions signup(Map<String, Object> input) throws Exception { return postJson("/api/auth/signup", input); }
    private ResultActions postJson(String path, Object input) throws Exception {
        return mvc.perform(post(path).header("X-Nansogong-Auth", "1").contentType(MediaType.APPLICATION_JSON).content(JSON.writeValueAsString(input)));
    }
}
