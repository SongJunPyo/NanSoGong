package com.nansogong;

import com.nansogong.dto.MemberUpdateRequest;
import com.nansogong.model.Member;
import com.nansogong.repository.MemberRepository;
import com.nansogong.service.AuthCredentialService;
import com.nansogong.service.MemberService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.databind.json.JsonMapper;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** 로그인 → 내 정보 조회/수정 → DB 재조회 → 비밀번호 변경 후 기존 JWT 차단. */
@SpringBootTest(properties = {
        "app.verification.mode=mock", "app.external.data-go-kr-service-key=mock-key",
        "app.jwt.secret=TEST-ONLY-signing-secret-0123456789-0123456789"
})
@AutoConfigureMockMvc
@Import(TestcontainersConfig.class)
class MemberProfileFlowTest {
    private static final JsonMapper JSON = JsonMapper.builder().build();
    private static final String OLD_PASSWORD = "OldTest123!";
    private static final String NEW_PASSWORD = "NewTest456!";
    @Autowired private MockMvc mvc;
    @Autowired private JdbcTemplate jdbc;
    @Autowired private MemberRepository members;
    @Autowired private PasswordEncoder passwords;
    @Autowired private AuthCredentialService credentials;
    @Autowired private MemberService profiles;
    private Long ownerId;
    private Long otherId;

    @BeforeEach
    void seed() {
        // Testcontainers 전용 DB다. 개발용 DB나 사용자 계정은 사용하지 않는다.
        jdbc.execute("TRUNCATE TABLE member CASCADE");
        ownerId = members.saveAndFlush(Member.create("profileowner", passwords.encode(OLD_PASSWORD), "프로필테스트", "01000001001")).getId();
        otherId = members.saveAndFlush(Member.create("otherprofile", passwords.encode(OLD_PASSWORD), "다른테스트", "01000001002")).getId();
    }

    @Test
    void loadsAndUpdatesOnlyTheAuthenticatedMemberAndKeepsTheSessionForNameChanges() throws Exception {
        String token = login("profileowner", OLD_PASSWORD);
        mvc.perform(get("/api/me").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk()).andExpect(jsonPath("$.name").value("프로필테스트"))
                .andExpect(jsonPath("$.passwordHash").doesNotExist());
        var before = members.findById(ownerId).orElseThrow();
        var originalHash = before.getPasswordHash();
        var verifiedAt = before.getPhoneVerifiedAt();
        var input = new LinkedHashMap<String, Object>();
        input.put("name", "  수정한이름  ");
        input.put("memberId", otherId); input.put("id", otherId);
        input.put("loginId", "changed-login"); input.put("phone", "01000009999");
        input.put("status", "WITHDRAWN"); input.put("passwordHash", "not-a-hash");
        input.put("phoneVerifiedAt", "2000-01-01T00:00:00Z");
        update(token, input).andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(ownerId)).andExpect(jsonPath("$.name").value("수정한이름"))
                .andExpect(jsonPath("$.loginId").value("profileowner")).andExpect(jsonPath("$.phone").value("01000001001"))
                .andExpect(jsonPath("$.status").value("ACTIVE")).andExpect(jsonPath("$.passwordHash").doesNotExist());
        var saved = members.findById(ownerId).orElseThrow();
        assertThat(saved.getName()).isEqualTo("수정한이름");
        assertThat(saved.getPasswordHash()).isEqualTo(originalHash);
        assertThat(saved.getPhoneVerifiedAt()).isEqualTo(verifiedAt);
        assertThat(members.findById(otherId).orElseThrow().getName()).isEqualTo("다른테스트");
        mvc.perform(get("/api/me").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk()).andExpect(jsonPath("$.name").value("수정한이름"));
    }

    @Test
    void requiresLoginForReadingAndSaving() throws Exception {
        mvc.perform(get("/api/me")).andExpect(status().isUnauthorized());
        mvc.perform(patch("/api/me").contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"공격\"}"))
                .andExpect(status().isUnauthorized());
        assertThat(members.findById(ownerId).orElseThrow().getName()).isEqualTo("프로필테스트");
    }

    @ParameterizedTest
    @ValueSource(strings = {"", "   ", "가가가가가가가가가가가가가가가가가가가가가가가가가가가가가가가가가가가가가가가가가가가가가가가가가가가"})
    void invalidNamesNeverSave(String name) throws Exception {
        update(login("profileowner", OLD_PASSWORD), Map.of("name", name)).andExpect(status().isBadRequest());
        assertThat(members.findById(ownerId).orElseThrow().getName()).isEqualTo("프로필테스트");
    }

    @Test
    void rejectsIncompletePasswordFieldsAndMismatchedConfirmation() throws Exception {
        String token = login("profileowner", OLD_PASSWORD);
        update(token, Map.of("name", "변경실패", "password", NEW_PASSWORD)).andExpect(status().isBadRequest());
        update(token, Map.of("name", "변경실패", "currentPassword", OLD_PASSWORD)).andExpect(status().isBadRequest());
        var input = passwordInput(); input.put("passwordConfirm", "OtherTest789!");
        update(token, input).andExpect(status().isBadRequest());
        assertThat(members.findById(ownerId).orElseThrow().getName()).isEqualTo("프로필테스트");
    }

    @Test
    void wrongCurrentPasswordDoesNotPartiallySaveTheName() throws Exception {
        String token = login("profileowner", OLD_PASSWORD);
        var input = passwordInput(); input.put("currentPassword", "WrongTest123!");
        update(token, input).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("현재 비밀번호가 올바르지 않아요"));
        var member = members.findById(ownerId).orElseThrow();
        assertThat(member.getName()).isEqualTo("프로필테스트");
        assertThat(passwords.matches(OLD_PASSWORD, member.getPasswordHash())).isTrue();
        mvc.perform(get("/api/me").header("Authorization", "Bearer " + token)).andExpect(status().isOk());
    }

    @ParameterizedTest
    @ValueSource(strings = {"short", "onlyletters!", "12345678!", "Password1", "Pass word1!"})
    void enforcesTheExistingPasswordRules(String password) throws Exception {
        var input = passwordInput(); input.put("password", password); input.put("passwordConfirm", password);
        update(login("profileowner", OLD_PASSWORD), input).andExpect(status().isBadRequest());
        assertThat(members.findById(ownerId).orElseThrow().getName()).isEqualTo("프로필테스트");
    }

    @Test
    void enforcesBcryptByteLimit() throws Exception {
        var input = passwordInput();
        input.put("password", "가".repeat(30) + "Aa1!"); input.put("passwordConfirm", input.get("password"));
        update(login("profileowner", OLD_PASSWORD), input).andExpect(status().isBadRequest());
        assertThat(passwords.matches(OLD_PASSWORD, members.findById(ownerId).orElseThrow().getPasswordHash())).isTrue();
    }

    @Test
    void changesThePasswordAndInvalidatesExistingOwnerTokensOnly() throws Exception {
        String first = login("profileowner", OLD_PASSWORD), second = login("profileowner", OLD_PASSWORD);
        String other = login("otherprofile", OLD_PASSWORD);
        update(first, passwordInput()).andExpect(status().isOk()).andExpect(jsonPath("$.name").value("이름비밀번호수정"))
                .andExpect(jsonPath("$.password").doesNotExist()).andExpect(jsonPath("$.currentPassword").doesNotExist());
        var member = members.findById(ownerId).orElseThrow();
        assertThat(member.getPasswordHash()).isNotEqualTo(NEW_PASSWORD);
        assertThat(passwords.matches(NEW_PASSWORD, member.getPasswordHash())).isTrue();
        for (String token : new String[]{first, second}) {
            mvc.perform(get("/api/me").header("Authorization", "Bearer " + token)).andExpect(status().isUnauthorized());
            update(token, Map.of("name", "오래된세션")).andExpect(status().isUnauthorized());
        }
        loginAttempt("profileowner", OLD_PASSWORD).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/me").header("Authorization", "Bearer " + login("profileowner", NEW_PASSWORD)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.name").value("이름비밀번호수정"));
        mvc.perform(get("/api/me").header("Authorization", "Bearer " + other)).andExpect(status().isOk());
    }

    @Test
    void databaseFailureRollsBackNameAndPasswordTogether() throws Exception {
        String token = login("profileowner", OLD_PASSWORD);
        String hash = members.findById(ownerId).orElseThrow().getPasswordHash();
        jdbc.execute("ALTER TABLE member ADD CONSTRAINT profile_test_failure CHECK (name <> 'force-rollback')");
        try {
            var input = passwordInput(); input.put("name", "force-rollback");
            update(token, input).andExpect(status().isServiceUnavailable())
                    .andExpect(jsonPath("$.message").value("저장소에 연결할 수 없어요. 잠시 후 다시 시도해 주세요"));
            var member = members.findById(ownerId).orElseThrow();
            assertThat(member.getName()).isEqualTo("프로필테스트");
            assertThat(member.getPasswordHash()).isEqualTo(hash);
            mvc.perform(get("/api/me").header("Authorization", "Bearer " + token)).andExpect(status().isOk());
        } finally { jdbc.execute("ALTER TABLE member DROP CONSTRAINT profile_test_failure"); }
    }

    @Test
    void simultaneousPasswordChangesAllowOneCredentialVersionOnly() throws Exception {
        String version = credentials.version(members.findById(ownerId).orElseThrow());
        var start = new CountDownLatch(1);
        try (var executor = Executors.newFixedThreadPool(2)) {
            var first = executor.submit(() -> attemptUpdate(start, version, "Concurrent1!", "동시수정1"));
            var second = executor.submit(() -> attemptUpdate(start, version, "Concurrent2!", "동시수정2"));
            start.countDown();
            var statuses = java.util.List.of(first.get(10, TimeUnit.SECONDS), second.get(10, TimeUnit.SECONDS));
            assertThat(statuses).containsExactlyInAnyOrder(200, 401);
        }
        var member = members.findById(ownerId).orElseThrow();
        assertThat(passwords.matches("Concurrent1!", member.getPasswordHash()) || passwords.matches("Concurrent2!", member.getPasswordHash())).isTrue();
        assertThatThrownBy(() -> profiles.updateMe(ownerId, version, new MemberUpdateRequest("오래된수정", null, null, null)))
                .isInstanceOf(ResponseStatusException.class);
    }

    private int attemptUpdate(CountDownLatch start, String version, String password, String name) throws InterruptedException {
        start.await();
        try { profiles.updateMe(ownerId, version, new MemberUpdateRequest(name, OLD_PASSWORD, password, password)); return 200; }
        catch (ResponseStatusException error) { return error.getStatusCode().value(); }
    }
    private Map<String, Object> passwordInput() {
        return new LinkedHashMap<>(Map.of("name", "이름비밀번호수정", "currentPassword", OLD_PASSWORD, "password", NEW_PASSWORD, "passwordConfirm", NEW_PASSWORD));
    }
    private org.springframework.test.web.servlet.ResultActions update(String token, Map<String, Object> input) throws Exception {
        return mvc.perform(patch("/api/me").header("Authorization", "Bearer " + token).contentType(MediaType.APPLICATION_JSON).content(JSON.writeValueAsBytes(input)));
    }
    private org.springframework.test.web.servlet.ResultActions loginAttempt(String loginId, String password) throws Exception {
        return mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON).content(JSON.writeValueAsBytes(Map.of("loginId", loginId, "password", password))));
    }
    private String login(String loginId, String password) throws Exception {
        return JSON.readTree(loginAttempt(loginId, password).andExpect(status().isOk()).andReturn().getResponse().getContentAsString()).get("accessToken").asString();
    }
}
