package com.nansogong;

import com.nansogong.model.Member;
import com.nansogong.repository.MemberRepository;
import com.nansogong.service.*;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.MvcResult;
import tools.jackson.databind.json.JsonMapper;

import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/** REAL 정책 + 실제 DB·Redis + 발송부만 테스트 대역. 실제 SENS 발송·수신 검증이 아니다. */
@SpringBootTest(properties = {"app.verification.mode=real", "app.jwt.secret=TEST-ONLY-sms-signing-0123456789-0123456789"})
@AutoConfigureMockMvc
@Import(TestcontainersConfig.class)
class AuthSmsFlowTest {
    private static final JsonMapper JSON = JsonMapper.builder().build();
    private static final String PHONE = "01000003001", NEXT = "01000003003", PASSWORD = "OldTest123!", NEW = "NewTest456!";
    @MockitoBean AuthSensSmsSender sender;
    @Autowired MockMvc mvc;
    @Autowired JdbcTemplate jdbc;
    @Autowired MemberRepository members;
    @Autowired PasswordEncoder passwords;
    @Autowired StringRedisTemplate redis;
    @Autowired AuthCredentialService credentials;
    private final List<Sent> sent = new CopyOnWriteArrayList<>();
    private Long memberId;
    @BeforeEach void seed() {
        jdbc.execute("TRUNCATE TABLE member CASCADE");
        try (var connection = redis.getConnectionFactory().getConnection()) { connection.serverCommands().flushDb(); }
        memberId = members.saveAndFlush(Member.create("smsowner", passwords.encode(PASSWORD), "SMS테스트", PHONE)).getId();
        members.saveAndFlush(Member.create("othersms", passwords.encode(PASSWORD), "다른테스트", "01000003002"));
        sent.clear(); when(sender.isConfigured()).thenReturn(true);
        doAnswer(call -> { sent.add(new Sent(call.getArgument(0), call.getArgument(1))); return null; }).when(sender).send(anyString(), anyString());
    }
    @Test void storesOnlyCodeHmacAndSendingNeverCompletesVerification() throws Exception {
        var response = postJson("/api/auth/phone-verifications", Map.of("name","가입테스트","phone",PHONE), null)
                .andExpect(status().isOk()).andExpect(jsonPath("$.code").doesNotExist()).andExpect(jsonPath("$.verificationToken").doesNotExist()).andReturn();
        assertThat(sent).hasSize(1); assertThat(sent.getFirst().code).matches("[0-9]{6}");
        String key = redis.keys("auth:sms:*:challenge").iterator().next(); var values = redis.opsForHash().entries(key);
        assertThat(values.get("code")).asString().matches("[0-9a-f]{64}"); assertThat(values.values()).doesNotContain(PHONE, sent.getFirst().code);
        postJson("/api/auth/signup", Map.of("phoneVerificationToken", body(response,"challengeId")),null).andExpect(status().isBadRequest());
    }
    @Test void resendReplacesOldChallengeAndOnlyLatestCodeCanBeConfirmedOnce() throws Exception {
        String first = signupChallenge(); String firstCode = lastCode();
        String second = signupChallenge(); String secondCode = lastCode();
        signupConfirm(first, firstCode).andExpect(status().isBadRequest());
        signupConfirm(second, secondCode).andExpect(status().isOk()).andExpect(jsonPath("$.verificationToken").isString());
        signupConfirm(second, secondCode).andExpect(status().isBadRequest());
    }
    @Test void challengeExpiresAndFiveWrongAttemptsLockIt() throws Exception {
        String id = signupChallenge(), right = lastCode(); String wrong = wrong(right);
        for (int i=0;i<5;i++) signupConfirm(id,wrong).andExpect(status().isBadRequest());
        signupConfirm(id,right).andExpect(status().isBadRequest());
        String next = signupChallenge(); redis.keys("auth:sms:*:challenge").forEach(key -> redis.expire(key,Duration.ZERO));
        signupConfirm(next,lastCode()).andExpect(status().isBadRequest());
    }
    @Test void missingPreparationAndDeliveryFailureNeverFallBackToDemoCode() throws Exception {
        when(sender.isConfigured()).thenReturn(false);
        postJson("/api/auth/phone-verifications", Map.of("name","가입테스트","phone",PHONE),null).andExpect(status().isServiceUnavailable());
        assertThat(sent).isEmpty();
        when(sender.isConfigured()).thenReturn(true); doThrow(new IllegalStateException("test vendor error")).when(sender).send(anyString(),anyString());
        postJson("/api/auth/phone-verifications", Map.of("name","가입테스트","phone",PHONE),null).andExpect(status().isServiceUnavailable());
        assertThat(redis.keys("auth:sms:*:challenge")).isEmpty();
        signupConfirm(java.util.UUID.randomUUID().toString(),"000000").andExpect(status().isBadRequest());
    }
    @Test void recipientResendLimitCannotBeBypassedByChangingSignupNames() throws Exception {
        for (int i=0;i<3;i++) postJson("/api/auth/phone-verifications",Map.of("name","테스트"+i,"phone",PHONE),null).andExpect(status().isOk());
        postJson("/api/auth/phone-verifications",Map.of("name","새이름","phone",PHONE),null).andExpect(status().isTooManyRequests());
        assertThat(sent).hasSize(3);
    }
    @Test void resetsNormalAccountAndBlocksOldAccessRefreshAndProofReplay() throws Exception {
        var session = login("smsowner"); var other = login("othersms");
        String proof = resetProof();
        resetComplete(proof,NEW).andExpect(status().isNoContent());
        assertThat(passwords.matches(NEW,members.findById(memberId).orElseThrow().getPasswordHash())).isTrue();
        postJson("/api/auth/login",Map.of("loginId","smsowner","password",PASSWORD),null).andExpect(status().isUnauthorized());
        postJson("/api/auth/login",Map.of("loginId","smsowner","password",NEW),null).andExpect(status().isOk());
        me(session.access).andExpect(status().isUnauthorized());
        String csrf = body(mvc.perform(get("/api/auth/csrf").cookie(session.cookie)).andExpect(status().isOk()).andReturn(),"csrfToken");
        mvc.perform(post("/api/auth/refresh").cookie(session.cookie).header("X-Nansogong-Auth","1").header("X-CSRF-Token",csrf)).andExpect(status().isUnauthorized());
        me(other.access).andExpect(status().isOk()); resetComplete(proof,"LaterTest789!").andExpect(status().isBadRequest());
    }
    @Test void missingOrWrongAccountPhoneDoesNotSendOrIssueProof() throws Exception {
        for(var account : List.of("unknownsms", "othersms")) {
            String id = body(postJson("/api/auth/password-resets",Map.of("loginId",account,"phone",PHONE),null).andExpect(status().isOk()).andReturn(),"challengeId");
            postJson("/api/auth/password-resets/"+id+"/confirmations",Map.of("loginId",account,"phone",PHONE,"code","000000"),null)
                    .andExpect(status().isBadRequest()).andExpect(jsonPath("$.resetToken").doesNotExist());
        }
        assertThat(sent).isEmpty();
    }
    @Test void phoneChangeRequiresPasswordAndOnlyChangesTheAuthenticatedMemberAfterSave() throws Exception {
        var owner = login("smsowner"); var other = login("othersms");
        postJson("/api/me/phone-verifications",Map.of("phone",NEXT,"currentPassword","WrongTest123!"),owner.access).andExpect(status().isBadRequest());
        assertThat(sent).isEmpty();
        String proof = phoneProof(owner.access,NEXT);
        assertThat(members.findById(memberId).orElseThrow().getPhone()).isEqualTo(PHONE);
        updatePhone(other.access,NEXT,proof).andExpect(status().isBadRequest());
        updatePhone(owner.access,NEXT,proof).andExpect(status().isOk()).andExpect(jsonPath("$.phone").value(NEXT));
        assertThat(members.findById(memberId).orElseThrow().getPhone()).isEqualTo(NEXT);
        assertThat(members.findByLoginId("othersms").orElseThrow().getPhone()).isEqualTo("01000003002");
        updatePhone(owner.access,NEXT,proof).andExpect(status().isBadRequest());
    }
    @Test void verificationPurposeAndPhoneCannotBeSubstituted() throws Exception {
        var owner = login("smsowner");
        String id = signupChallenge();
        String signup = body(signupConfirm(id,lastCode()).andExpect(status().isOk()).andReturn(),"verificationToken");
        resetComplete(signup,NEW).andExpect(status().isBadRequest()); updatePhone(owner.access,PHONE,signup).andExpect(status().isBadRequest());
        String phone = phoneProof(owner.access,NEXT);
        resetComplete(phone,NEW).andExpect(status().isBadRequest()); updatePhone(owner.access,"01000003004",phone).andExpect(status().isBadRequest());
        String reset = resetProof(); updatePhone(owner.access,NEXT,reset).andExpect(status().isBadRequest());
    }
    @Test void expiredProofCannotSaveAndDatabaseFailureRollsBackPhoneAndConsumesProof() throws Exception {
        var owner = login("smsowner"); String proof = phoneProof(owner.access,NEXT);
        String key = "auth:sms:proof:"+credentials.fingerprint("sms-proof",proof); redis.expire(key,Duration.ZERO);
        updatePhone(owner.access,NEXT,proof).andExpect(status().isBadRequest());
        String nextProof = phoneProof(owner.access,NEXT);
        jdbc.execute("ALTER TABLE member ADD CONSTRAINT sms_test_phone CHECK (phone <> '"+NEXT+"')");
        try { updatePhone(owner.access,NEXT,nextProof).andExpect(status().isServiceUnavailable()); }
        finally { jdbc.execute("ALTER TABLE member DROP CONSTRAINT sms_test_phone"); }
        assertThat(members.findById(memberId).orElseThrow().getPhone()).isEqualTo(PHONE);
        updatePhone(owner.access,NEXT,nextProof).andExpect(status().isBadRequest());
    }
    @Test void concurrentPasswordResetProofsCanChangeTheAccountOnlyOnce() throws Exception {
        String a = resetProof(), b = resetProof();
        try(var pool=Executors.newFixedThreadPool(2)) {
            var first=pool.submit(()->resetComplete(a,NEW).andReturn().getResponse().getStatus());
            var second=pool.submit(()->resetComplete(b,"OtherTest789!").andReturn().getResponse().getStatus());
            assertThat(List.of(first.get(10,TimeUnit.SECONDS),second.get(10,TimeUnit.SECONDS))).containsExactlyInAnyOrder(204,400);
        }
    }
    @Test void concurrentPhoneProofsAndPasswordChangesInvalidateOldReauthentication() throws Exception {
        var owner=login("smsowner"); String a=phoneProof(owner.access,NEXT), b=phoneProof(owner.access,"01000003004");
        try(var pool=Executors.newFixedThreadPool(2)) {
            var first=pool.submit(()->updatePhone(owner.access,NEXT,a).andReturn().getResponse().getStatus());
            var second=pool.submit(()->updatePhone(owner.access,"01000003004",b).andReturn().getResponse().getStatus());
            assertThat(List.of(first.get(10,TimeUnit.SECONDS),second.get(10,TimeUnit.SECONDS))).containsExactlyInAnyOrder(200,400);
        }
    }
    @Test void passwordChangeAfterPhoneChallengePreventsConfirmAndSave() throws Exception {
        var owner=login("smsowner"); String proof=phoneProof(owner.access,NEXT);
        mvc.perform(patch("/api/me").header("Authorization","Bearer "+owner.access).contentType(MediaType.APPLICATION_JSON)
                .content(JSON.writeValueAsBytes(Map.of("name","SMS테스트","currentPassword",PASSWORD,"password",NEW,"passwordConfirm",NEW)))).andExpect(status().isOk());
        updatePhone(owner.access,NEXT,proof).andExpect(status().isUnauthorized());
        assertThat(members.findById(memberId).orElseThrow().getPhone()).isEqualTo(PHONE);
    }
    private String signupChallenge() throws Exception { return body(postJson("/api/auth/phone-verifications",Map.of("name","가입테스트","phone",PHONE),null).andExpect(status().isOk()).andReturn(),"challengeId"); }
    private ResultActions signupConfirm(String id,String code) throws Exception { return postJson("/api/auth/phone-verifications/"+id+"/confirmations",Map.of("name","가입테스트","phone",PHONE,"code",code),null); }
    private String resetProof() throws Exception {
        String id=body(postJson("/api/auth/password-resets",Map.of("loginId","smsowner","phone",PHONE),null).andExpect(status().isOk()).andReturn(),"challengeId");
        return body(postJson("/api/auth/password-resets/"+id+"/confirmations",Map.of("loginId","smsowner","phone",PHONE,"code",lastCode()),null).andExpect(status().isOk()).andReturn(),"resetToken");
    }
    private String phoneProof(String access,String phone) throws Exception {
        String id=body(postJson("/api/me/phone-verifications",Map.of("phone",phone,"currentPassword",PASSWORD),access).andExpect(status().isOk()).andReturn(),"challengeId");
        return body(postJson("/api/me/phone-verifications/"+id+"/confirmations",Map.of("phone",phone,"code",lastCode()),access).andExpect(status().isOk()).andReturn(),"verificationToken");
    }
    private ResultActions resetComplete(String proof,String password) throws Exception { return postJson("/api/auth/password-resets/completions",Map.of("resetToken",proof,"password",password,"passwordConfirm",password),null); }
    private ResultActions updatePhone(String access,String phone,String proof) throws Exception { return mvc.perform(patch("/api/me/phone").header("Authorization","Bearer "+access).contentType(MediaType.APPLICATION_JSON).content(JSON.writeValueAsBytes(Map.of("phone",phone,"verificationToken",proof)))); }
    private ResultActions me(String access) throws Exception { return mvc.perform(get("/api/me").header("Authorization","Bearer "+access)); }
    private TestSession login(String id) throws Exception {
        var result=postJson("/api/auth/login",Map.of("loginId",id,"password",PASSWORD),null).andExpect(status().isOk()).andReturn();
        return new TestSession(body(result,"accessToken"),result.getResponse().getCookie(AuthCookieService.NAME));
    }
    private String body(MvcResult result,String key) throws Exception { return JSON.readTree(result.getResponse().getContentAsByteArray()).get(key).asString(); }
    private ResultActions postJson(String path,Object input,String access) throws Exception {
        var request=post(path).header("X-Nansogong-Auth","1").contentType(MediaType.APPLICATION_JSON).content(JSON.writeValueAsBytes(input));
        if(access!=null) request.header("Authorization","Bearer "+access);
        return mvc.perform(request);
    }
    private String lastCode() { return sent.getLast().code; }
    private String wrong(String code) { return String.format(java.util.Locale.ROOT,"%06d",(Integer.parseInt(code)+1)%1_000_000); }
    private record Sent(String phone,String code) { @Override public String toString(){return "Sent[redacted]";} }
    private record TestSession(String access,Cookie cookie) { @Override public String toString(){return "TestSession[redacted]";} }
}
