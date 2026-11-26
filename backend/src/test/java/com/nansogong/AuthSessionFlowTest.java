package com.nansogong;

import com.nansogong.model.Member;
import com.nansogong.repository.MemberRepository;
import com.nansogong.service.*;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.databind.json.JsonMapper;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties = {"app.verification.mode=mock", "app.jwt.secret=TEST-ONLY-session-signing-0123456789-0123456789"})
@AutoConfigureMockMvc
@Import(TestcontainersConfig.class)
class AuthSessionFlowTest {
    private static final JsonMapper JSON = JsonMapper.builder().build();
    private static final String PASSWORD = "OldTest123!";
    @Autowired MockMvc mvc;
    @Autowired MemberRepository members;
    @Autowired PasswordEncoder passwords;
    @Autowired JdbcTemplate jdbc;
    @Autowired StringRedisTemplate redis;
    @Autowired AuthSessionStore sessions;
    @Autowired AuthSessionService lifecycle;
    @Autowired JwtDecoder decoder;
    @Autowired JwtEncoder encoder;
    private Long memberId;
    @BeforeEach void seed() {
        jdbc.execute("TRUNCATE TABLE member CASCADE");
        try (var connection = redis.getConnectionFactory().getConnection()) { connection.serverCommands().flushDb(); }
        memberId = members.saveAndFlush(Member.create("sessionowner", passwords.encode(PASSWORD), "세션테스트", "01000001001")).getId();
        members.saveAndFlush(Member.create("othersession", passwords.encode(PASSWORD), "별도테스트", "01000001002"));
    }
    @Test void loginUsesHostHttpOnlyCookieAndOnlyRememberedLoginsPersistTheCookie() throws Exception {
        var session = login("sessionowner", false);
        var remembered = login("sessionowner", true);
        assertThat(session.setCookie).contains("HttpOnly", "SameSite=Lax", "Path=/api/auth").doesNotContain("Max-Age", "Domain=", "Secure");
        assertThat(remembered.setCookie).contains("Max-Age=", "HttpOnly");
        assertThat(decoder.decode(session.access).getClaimAsString("sid")).isNotEqualTo(decoder.decode(remembered.access).getClaimAsString("sid"));
        assertThat(sessions.recognizes(session.cookie.getValue())).isTrue();
        var state = redis.opsForHash().entries("auth:session:{" + AuthSessionStore.sessionId(session.cookie.getValue()) + "}");
        assertThat(state.values()).doesNotContain(session.cookie.getValue());
        assertThat(state.get("current")).isNotEqualTo(session.cookie.getValue());
    }
    @Test void refreshRotatesAndReplayRevokesOnlyThatSessionsAccessAndRefreshTokens() throws Exception {
        TestSession first = login("sessionowner", true), otherDevice = login("sessionowner", true);
        var refreshed = refresh(first.cookie).andExpect(status().isOk()).andExpect(jsonPath("$.refreshToken").doesNotExist()).andReturn();
        String access = body(refreshed, "accessToken"); Cookie next = refreshed.getResponse().getCookie(AuthCookieService.NAME);
        assertThat(next.getValue()).isNotEqualTo(first.cookie.getValue());
        me(access).andExpect(status().isOk());
        refresh(first.cookie).andExpect(status().isUnauthorized());
        me(first.access).andExpect(status().isUnauthorized()); me(access).andExpect(status().isUnauthorized());
        refresh(next).andExpect(status().isUnauthorized()); me(otherDevice.access).andExpect(status().isOk());
    }
    @Test void unknownForgedRefreshSecretCannotRevokeAKnownSession() throws Exception {
        var session = login("sessionowner", true);
        String forged = AuthSessionStore.sessionId(session.cookie.getValue()) + "." + "A".repeat(43);
        assertThat(sessions.rotate(forged).result()).isEqualTo(AuthSessionStore.Result.INVALID);
        me(session.access).andExpect(status().isOk()); refresh(session.cookie).andExpect(status().isOk());
    }
    @Test void concurrentRefreshHasOneWinnerAndTreatsTheOtherUseAsReplay() throws Exception {
        var session = login("sessionowner", true); var start = new CountDownLatch(1);
        try (var executor = Executors.newFixedThreadPool(2)) {
            var a = executor.submit(() -> rotateAfter(start, session.cookie.getValue()));
            var b = executor.submit(() -> rotateAfter(start, session.cookie.getValue()));
            start.countDown();
            assertThat(List.of(a.get(10, TimeUnit.SECONDS), b.get(10, TimeUnit.SECONDS)))
                    .allMatch(result -> result == AuthSessionStore.Result.OK || result == AuthSessionStore.Result.REUSED || result == AuthSessionStore.Result.INVALID)
                    .contains(AuthSessionStore.Result.REUSED);
        }
        me(session.access).andExpect(status().isUnauthorized());
    }
    @Test void cookieMutationsRejectMissingCsrfAndForeignOrigins() throws Exception {
        var session = login("sessionowner", false);
        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON).content(JSON.writeValueAsBytes(Map.of("loginId", "sessionowner", "password", PASSWORD))))
                .andExpect(status().isForbidden());
        mvc.perform(post("/api/auth/refresh").cookie(session.cookie).header("X-Nansogong-Auth", "1")).andExpect(status().isForbidden());
        String csrf = csrf(session.cookie);
        mvc.perform(post("/api/auth/logout").cookie(session.cookie).header("X-Nansogong-Auth", "1").header("X-CSRF-Token", csrf).header("Origin", "https://attacker.invalid"))
                .andExpect(status().isForbidden());
        mvc.perform(post("/api/auth/logout").cookie(session.cookie).header("X-Nansogong-Auth", "1").header("X-CSRF-Token", "forged"))
                .andExpect(status().isForbidden());
        me(session.access).andExpect(status().isOk());
    }
    @ParameterizedTest @ValueSource(strings = {"/api/auth/%72efresh", "/api/auth/%6cogout"})
    void encodedCookieEndpointCannotBypassCsrf(String path) throws Exception {
        var session = login("sessionowner", true);
        mvc.perform(post(java.net.URI.create(path)).cookie(session.cookie).header("X-Nansogong-Auth", "1"))
                .andExpect(status().isForbidden());
        me(session.access).andExpect(status().isOk());
    }
    @Test void csrfCannotBeBorrowedFromAnotherSession() throws Exception {
        TestSession a = login("sessionowner", false), b = login("othersession", false);
        mvc.perform(post("/api/auth/refresh").cookie(a.cookie).header("X-Nansogong-Auth", "1").header("X-CSRF-Token", csrf(b.cookie)))
                .andExpect(status().isForbidden());
        me(a.access).andExpect(status().isOk()); me(b.access).andExpect(status().isOk());
    }
    @Test void logoutRevokesCurrentAccessAndRefreshAndClearsMatchingCookie() throws Exception {
        TestSession current = login("sessionowner", true), other = login("sessionowner", false);
        mvc.perform(post("/api/auth/logout").cookie(current.cookie).header("X-Nansogong-Auth", "1").header("X-CSRF-Token", csrf(current.cookie)))
                .andExpect(status().isNoContent()).andExpect(cookie().maxAge(AuthCookieService.NAME, 0));
        me(current.access).andExpect(status().isUnauthorized()); refresh(current.cookie).andExpect(status().isUnauthorized());
        me(other.access).andExpect(status().isOk());
    }
    @Test void expiredSessionRejectsAccessEvenBeforeJwtExpiryAndCannotRefresh() throws Exception {
        var session = login("sessionowner", true);
        redis.expire("auth:session:{" + AuthSessionStore.sessionId(session.cookie.getValue()) + "}", Duration.ZERO);
        me(session.access).andExpect(status().isUnauthorized()); refresh(session.cookie).andExpect(status().isUnauthorized());
    }
    @Test void expiredAccessCanBeRestoredWithValidRefreshCookie() throws Exception {
        var session = login("sessionowner", true); var current = decoder.decode(session.access);
        var claims = JwtClaimsSet.builder().claims(map -> map.putAll(current.getClaims()))
                .issuedAt(Instant.now().minusSeconds(600)).expiresAt(Instant.now().minusSeconds(120)).build();
        String expired = encoder.encode(JwtEncoderParameters.from(JwsHeader.with(MacAlgorithm.HS256).build(), claims)).getTokenValue();
        me(expired).andExpect(status().isUnauthorized());
        me(body(refresh(session.cookie).andExpect(status().isOk()).andReturn(), "accessToken")).andExpect(status().isOk());
    }
    @Test void passwordChangeInvalidatesAllOwnerAccessAndRefreshButKeepsOtherMembersSessions() throws Exception {
        TestSession a = login("sessionowner", true), b = login("sessionowner", false), other = login("othersession", true);
        mvc.perform(patch("/api/me").header("Authorization", "Bearer " + a.access).contentType(MediaType.APPLICATION_JSON)
                .content(JSON.writeValueAsBytes(Map.of("name", "변경테스트", "currentPassword", PASSWORD, "password", "NewTest456!", "passwordConfirm", "NewTest456!"))))
                .andExpect(status().isOk());
        for (var old : List.of(a,b)) { me(old.access).andExpect(status().isUnauthorized()); refresh(old.cookie).andExpect(status().isUnauthorized()); }
        me(other.access).andExpect(status().isOk()); refresh(other.cookie).andExpect(status().isOk());
    }
    @ParameterizedTest @ValueSource(strings = {"LOCKED", "WITHDRAWN"})
    void inactiveAccountCannotLoginUseAccessOrRefresh(String state) throws Exception {
        var session = login("sessionowner", true);
        // 정책 미정인 탈퇴 작업을 대신 실행하지 않는다. 테스트 DB의 상태 검증만 확인한다.
        jdbc.update("UPDATE member SET status = ? WHERE member_id = ?", state, memberId);
        loginRequest("sessionowner", false).andExpect(status().isForbidden());
        me(session.access).andExpect(status().isUnauthorized()); refresh(session.cookie).andExpect(status().isUnauthorized());
    }
    @Test void sessionCsrfAndTokensAreNotCacheableAndWithdrawalRemainsUnavailable() throws Exception {
        var session = login("sessionowner", false);
        mvc.perform(get("/api/auth/csrf").cookie(session.cookie)).andExpect(status().isOk()).andExpect(header().string("Cache-Control", "no-store"));
        mvc.perform(get("/api/auth/capabilities")).andExpect(status().isOk()).andExpect(jsonPath("$.withdrawalAvailable").value(false));
        mvc.perform(delete("/api/me").header("Authorization", "Bearer " + session.access)).andExpect(status().isMethodNotAllowed());
        me(session.access).andExpect(status().isOk());
    }
    private AuthSessionStore.Result rotateAfter(CountDownLatch start, String token) throws InterruptedException { start.await(); return sessions.rotate(token).result(); }
    private ResultActions loginRequest(String loginId, boolean remember) throws Exception {
        return mvc.perform(post("/api/auth/login").header("X-Nansogong-Auth", "1").contentType(MediaType.APPLICATION_JSON)
                .content(JSON.writeValueAsBytes(Map.of("loginId",loginId,"password",PASSWORD,"rememberMe",remember))));
    }
    private TestSession login(String loginId, boolean remember) throws Exception {
        var result = loginRequest(loginId, remember).andExpect(status().isOk()).andExpect(jsonPath("$.refreshToken").doesNotExist())
                .andExpect(header().string("Cache-Control", "no-store")).andReturn();
        return new TestSession(body(result,"accessToken"), result.getResponse().getCookie(AuthCookieService.NAME), result.getResponse().getHeader("Set-Cookie"));
    }
    private ResultActions me(String access) throws Exception { return mvc.perform(get("/api/me").header("Authorization","Bearer " + access)); }
    private String csrf(Cookie cookie) throws Exception {
        return body(mvc.perform(get("/api/auth/csrf").cookie(cookie)).andExpect(status().isOk()).andReturn(), "csrfToken");
    }
    private ResultActions refresh(Cookie cookie) throws Exception {
        var csrfResponse = mvc.perform(get("/api/auth/csrf").cookie(cookie)).andReturn();
        String token = csrfResponse.getResponse().getStatus() == 200 ? body(csrfResponse,"csrfToken") : "invalid";
        return mvc.perform(post("/api/auth/refresh").cookie(cookie).header("X-Nansogong-Auth","1").header("X-CSRF-Token", token));
    }
    private String body(MvcResult result, String key) throws Exception { return JSON.readTree(result.getResponse().getContentAsByteArray()).get(key).asString(); }
    private record TestSession(String access, Cookie cookie, String setCookie) { @Override public String toString() { return "TestSession[redacted]"; } }
}
