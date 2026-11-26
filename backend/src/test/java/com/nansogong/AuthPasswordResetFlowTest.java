package com.nansogong;

import com.nansogong.common.AppProperties;
import com.nansogong.model.Member;
import com.nansogong.repository.MemberRepository;
import com.nansogong.service.AuthCredentialService;
import com.nansogong.service.AuthPasswordResetService;
import com.nansogong.service.AuthPasswordResetPersistenceService;
import com.nansogong.dto.AuthPasswordResetStartRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.env.MockEnvironment;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.databind.json.JsonMapper;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import static org.assertj.core.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties = {"app.verification.mode=mock", "app.jwt.secret=TEST-ONLY-reset-signing-0123456789-0123456789",
        "logging.level.org.hibernate.SQL=OFF", "logging.level.org.hibernate.orm.jdbc.bind=OFF"})
@AutoConfigureMockMvc
@Import(TestcontainersConfig.class)
class AuthPasswordResetFlowTest {
    private static final JsonMapper JSON = JsonMapper.builder().build();
    private static final String OLD = "OldTest123!", NEW = "NewTest456!", PHONE = "01000009001";
    @Autowired MockMvc mvc;
    @Autowired JdbcTemplate jdbc;
    @Autowired StringRedisTemplate redis;
    @Autowired MemberRepository members;
    @Autowired PasswordEncoder passwords;
    @Autowired AppProperties props;
    @Autowired AuthCredentialService credentials;
    @Autowired AuthPasswordResetPersistenceService persistence;
    @Autowired JwtEncoder encoder;

    @BeforeEach void reset() {
        jdbc.execute("TRUNCATE TABLE member CASCADE");
        try (var connection = redis.getConnectionFactory().getConnection()) { connection.serverCommands().flushDb(); }
        members.saveAndFlush(Member.create("demo-office", passwords.encode(OLD), "데모테스트", "010-0000-9001"));
        members.saveAndFlush(Member.create("normalowner", passwords.encode(OLD), "일반테스트", "01000009002"));
    }

    @Test void resetsOnlyConfirmedAccountAndRejectsOldPasswordTokensAndReplay() throws Exception {
        String oldSession = login("demo-office", OLD), other = login("normalowner", OLD);
        String token = proof();
        complete(token, NEW, NEW).andExpect(status().isNoContent());
        String hash = members.findByLoginId("demo-office").orElseThrow().getPasswordHash();
        assertThat(hash).isNotEqualTo(NEW);
        assertThat(passwords.matches(NEW, hash)).isTrue();
        postJson("/api/auth/login", Map.of("loginId", "demo-office", "password", OLD)).andExpect(status().isUnauthorized());
        assertThat(login("demo-office", NEW)).isNotEmpty();
        mvc.perform(get("/api/me").header("Authorization", "Bearer " + oldSession)).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/stores").header("Authorization", "Bearer " + oldSession)).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/me").header("Authorization", "Bearer " + other)).andExpect(status().isOk());
        complete(token, "LaterTest789!", "LaterTest789!").andExpect(status().isBadRequest());
    }

    @Test void unknownWrongPhoneAndNormalAccountsGetNoResetProof() throws Exception {
        for (var input : List.of(Map.of("loginId", "missingowner", "phone", PHONE),
                Map.of("loginId", "demo-office", "phone", "01000009002"),
                Map.of("loginId", "normalowner", "phone", "01000009002"))) {
            String id = challenge(input.get("loginId"), input.get("phone"));
            confirm(id, input.get("loginId"), input.get("phone"), "000000").andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.resetToken").doesNotExist());
        }
        assertThat(login("demo-office", OLD)).isNotEmpty(); assertThat(login("normalowner", OLD)).isNotEmpty();
    }

    @Test void demoIdWithChangedRealPhoneCannotUseMockReset() throws Exception {
        jdbc.update("UPDATE member SET phone = ? WHERE login_id = ?", "01012345678", "demo-office");
        String id = challenge("demo-office", "01012345678");
        confirm(id, "demo-office", "01012345678", "000000").andExpect(status().isBadRequest());
    }

    @Test void codeHasFiveAttemptsAndCannotBeReplayed() throws Exception {
        String id = challenge("demo-office", PHONE);
        for (int i = 0; i < 5; i++) confirm(id, "demo-office", PHONE, "123456").andExpect(status().isBadRequest());
        confirm(id, "demo-office", PHONE, "000000").andExpect(status().isBadRequest());
        String next = challenge("demo-office", PHONE);
        confirm(next, "demo-office", PHONE, "000000").andExpect(status().isOk());
        confirm(next, "demo-office", PHONE, "000000").andExpect(status().isBadRequest());
    }

    @Test void wrongIdentityAndExpiredChallengeAreRejected() throws Exception {
        String id = challenge("demo-office", PHONE);
        confirm(id, "normalowner", PHONE, "000000").andExpect(status().isBadRequest());
        confirm(id, "demo-office", "01000009002", "000000").andExpect(status().isBadRequest());
        redis.expire("auth:password-reset:challenge:{" + id + "}", Duration.ZERO);
        confirm(id, "demo-office", PHONE, "000000").andExpect(status().isBadRequest());
    }

    @Test void invalidPasswordDoesNotConsumeProofButExpiredAndForgedProofsFail() throws Exception {
        String token = proof();
        complete(token, "short", "short").andExpect(status().isBadRequest());
        complete(token, NEW, "Mismatch123!").andExpect(status().isBadRequest());
        complete(token, "Aa1!" + "가".repeat(23), "Aa1!" + "가".repeat(23)).andExpect(status().isBadRequest());
        complete("forged", NEW, NEW).andExpect(status().isBadRequest());
        complete(token, NEW, NEW).andExpect(status().isNoContent());
        String expired = proof();
        redis.expire("auth:password-reset:proof:" + credentials.fingerprint("password-reset-proof", expired), Duration.ZERO);
        complete(expired, "LaterTest789!", "LaterTest789!").andExpect(status().isBadRequest());
    }

    @Test void signupPhoneProofCannotResetPassword() throws Exception {
        var challenge = postJson("/api/auth/phone-verifications", Map.of("name", "데모테스트", "phone", PHONE)).andReturn();
        String id = JSON.readTree(challenge.getResponse().getContentAsByteArray()).get("challengeId").asString();
        var response = postJson("/api/auth/phone-verifications/" + id + "/confirmations", Map.of("name", "데모테스트", "phone", PHONE, "code", "000000"))
                .andExpect(status().isOk()).andReturn();
        complete(JSON.readTree(response.getResponse().getContentAsByteArray()).get("verificationToken").asString(), NEW, NEW).andExpect(status().isBadRequest());
    }

    @Test void requestRateIsLimitedByAccountAndRemoteAddress() throws Exception {
        for (int i = 0; i < 3; i++) challenge("demo-office", PHONE);
        postJson("/api/auth/password-resets", Map.of("loginId", "demo-office", "phone", PHONE)).andExpect(status().isTooManyRequests());
        for (int i = 0; i < 16; i++) challenge("missingowner" + i, PHONE);
        postJson("/api/auth/password-resets", Map.of("loginId", "anotherowner", "phone", PHONE)).andExpect(status().isTooManyRequests());
    }

    @Test void concurrentProofsCanChangeTheSamePasswordOnlyOnce() throws Exception {
        String a = proof(), b = proof();
        try (var pool = Executors.newFixedThreadPool(2)) {
            var first = pool.submit(() -> complete(a, NEW, NEW).andReturn().getResponse().getStatus());
            var second = pool.submit(() -> complete(b, "OtherTest789!", "OtherTest789!").andReturn().getResponse().getStatus());
            assertThat(List.of(first.get(20, TimeUnit.SECONDS), second.get(20, TimeUnit.SECONDS))).containsExactlyInAnyOrder(204, 400);
        }
    }

    @Test void profileOrRealModeNeverFallsBackToMock() {
        var env = new MockEnvironment(); env.setActiveProfiles("aws");
        var aws = new AuthPasswordResetService(members, redis, props, env, credentials, passwords, persistence);
        assertThatThrownBy(() -> aws.request(new AuthPasswordResetStartRequest("demo-office", PHONE), "local"))
                .isInstanceOfSatisfying(ResponseStatusException.class, e -> assertThat(e.getStatusCode().value()).isEqualTo(503));
        env.setActiveProfiles("prod");
        assertThatThrownBy(() -> aws.request(new AuthPasswordResetStartRequest("demo-office", PHONE), "local")).isInstanceOf(ResponseStatusException.class);
        var realProps = new AppProperties(props.cors(), props.jwt(), new AppProperties.Verification(AppProperties.Verification.Mode.REAL, "000000"), props.crypto(), props.external());
        var real = new AuthPasswordResetService(members, redis, realProps, new MockEnvironment(), credentials, passwords, persistence);
        assertThatThrownBy(() -> real.request(new AuthPasswordResetStartRequest("demo-office", PHONE), "local")).isInstanceOf(ResponseStatusException.class);
    }

    @Test void failedDatabaseUpdateRollsBackAndRequiresFreshVerification() throws Exception {
        String token = proof();
        jdbc.execute("CREATE FUNCTION test_reject_password_update() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'test rollback'; END $$");
        jdbc.execute("CREATE TRIGGER test_reject_password_update BEFORE UPDATE OF password_hash ON member FOR EACH ROW EXECUTE FUNCTION test_reject_password_update()");
        try {
            complete(token, NEW, NEW).andExpect(status().isServiceUnavailable());
            assertThat(login("demo-office", OLD)).isNotEmpty();
        } finally {
            jdbc.execute("DROP TRIGGER test_reject_password_update ON member");
            jdbc.execute("DROP FUNCTION test_reject_password_update()");
        }
        complete(token, NEW, NEW).andExpect(status().isBadRequest());
        complete(proof(), NEW, NEW).andExpect(status().isNoContent());
    }

    @Test void legacyMalformedAndExpiredJwtFailWhileFreshLoginWorks() throws Exception {
        String subject = members.findByLoginId("demo-office").orElseThrow().getId().toString();
        var header = JwsHeader.with(MacAlgorithm.HS256).build();
        for (var claims : List.of(
                JwtClaimsSet.builder().subject(subject).issuedAt(Instant.now()).expiresAt(Instant.now().plusSeconds(60)).build(),
                JwtClaimsSet.builder().subject(subject).claim("credentialVersion", 123).expiresAt(Instant.now().plusSeconds(60)).build(),
                JwtClaimsSet.builder().subject(subject).claim("credentialVersion", credentials.version(members.findByLoginId("demo-office").orElseThrow()))
                        .issuedAt(Instant.now().minusSeconds(3600)).expiresAt(Instant.now().minusSeconds(120)).build())) {
            String token = encoder.encode(JwtEncoderParameters.from(header, claims)).getTokenValue();
            mvc.perform(get("/api/me").header("Authorization", "Bearer " + token)).andExpect(status().isUnauthorized());
        }
        mvc.perform(get("/api/me").header("Authorization", "Bearer " + login("demo-office", OLD))).andExpect(status().isOk());
    }

    private String challenge(String loginId, String phone) throws Exception {
        var result = postJson("/api/auth/password-resets", Map.of("loginId", loginId, "phone", phone)).andExpect(status().isOk()).andReturn();
        return JSON.readTree(result.getResponse().getContentAsByteArray()).get("challengeId").asString();
    }
    private org.springframework.test.web.servlet.ResultActions confirm(String id, String loginId, String phone, String code) throws Exception {
        return postJson("/api/auth/password-resets/" + id + "/confirmations", Map.of("loginId", loginId, "phone", phone, "code", code));
    }
    private String proof() throws Exception {
        var result = confirm(challenge("demo-office", PHONE), "demo-office", PHONE, "000000").andExpect(status().isOk()).andReturn();
        return JSON.readTree(result.getResponse().getContentAsByteArray()).get("resetToken").asString();
    }
    private org.springframework.test.web.servlet.ResultActions complete(String token, String password, String confirm) throws Exception {
        return postJson("/api/auth/password-resets/completions", Map.of("resetToken", token, "password", password, "passwordConfirm", confirm));
    }
    private String login(String loginId, String password) throws Exception {
        var result = postJson("/api/auth/login", Map.of("loginId", loginId, "password", password)).andExpect(status().isOk()).andReturn();
        return JSON.readTree(result.getResponse().getContentAsByteArray()).get("accessToken").asString();
    }
    private org.springframework.test.web.servlet.ResultActions postJson(String path, Object input) throws Exception {
        return mvc.perform(post(path).contentType(MediaType.APPLICATION_JSON).content(JSON.writeValueAsString(input)));
    }
}
