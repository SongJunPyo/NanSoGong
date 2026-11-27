package com.nansogong;

import com.nansogong.common.AppProperties;
import com.nansogong.service.AuthSensSmsSender;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.mock.http.client.MockClientHttpRequest;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.databind.json.JsonMapper;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.nio.charset.Charset;
import java.util.Base64;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.*;
import static org.springframework.test.web.client.response.MockRestResponseCreators.*;

/** 공식 HTTP 규격을 MockRestServiceServer로 확인한다. SENS에 실제 요청하지 않는다. */
class AuthSensSmsSenderTest {
    private MockRestServiceServer server;
    private AuthSensSmsSender sender;
    private AppProperties props;
    private static final String PATH="/sms/v2/services/ncp:sms:kr:test:auth/messages";
    @BeforeEach void setup() {
        var builder=RestClient.builder().baseUrl("https://sens.apigw.ntruss.com");
        server=MockRestServiceServer.bindTo(builder).build(); props=mock(AppProperties.class);
        when(props.verification()).thenReturn(new AppProperties.Verification(AppProperties.Verification.Mode.REAL,"000000"));
        when(props.sens()).thenReturn(new AppProperties.Sens("https://sens.apigw.ntruss.com","ncp:sms:kr:test:auth","test-access","test-secret","01000000000"));
        sender=new AuthSensSmsSender(builder.build(),props);
    }
    @Test void signsTheExactPathAndTimestampAndAcceptsOnlyAQueuedSmsResponse() throws Exception {
        server.expect(requestTo("https://sens.apigw.ntruss.com"+PATH)).andExpect(method(HttpMethod.POST))
            .andExpect(header("x-ncp-iam-access-key","test-access")).andExpect(request->{
                String timestamp=request.getHeaders().getFirst("x-ncp-apigw-timestamp");
                assertThat(Math.abs(System.currentTimeMillis()-Long.parseLong(timestamp))).isLessThan(5000);
                try {
                    Mac mac=Mac.getInstance("HmacSHA256");mac.init(new SecretKeySpec("test-secret".getBytes(StandardCharsets.UTF_8),"HmacSHA256"));
                    String signature=Base64.getEncoder().encodeToString(mac.doFinal(("POST "+PATH+"\n"+timestamp+"\ntest-access").getBytes(StandardCharsets.UTF_8)));
                    assertThat(request.getHeaders().getFirst("x-ncp-apigw-signature-v2")).isEqualTo(signature);
                    var body=JsonMapper.builder().build().readTree(((MockClientHttpRequest)request).getBodyAsString());
                    assertThat(body.get("type").asString()).isEqualTo("SMS"); assertThat(body.get("contentType").asString()).isEqualTo("COMM");
                    assertThat(body.get("messages").get(0).get("to").asString()).isEqualTo("01000003001");
                    String text=body.get("content").asString();assertThat(text).contains("654321");assertThat(text.getBytes(Charset.forName("EUC-KR")).length).isLessThanOrEqualTo(90);
                } catch(Exception e) { throw new AssertionError("SENS 계약 검증 실패",e); }
            }).andRespond(withStatus(HttpStatus.ACCEPTED).contentType(MediaType.APPLICATION_JSON).body("{\"requestId\":\"test-request\",\"statusCode\":\"202\",\"statusName\":\"success\"}"));
        sender.send("01000003001","654321");server.verify();
    }
    @ParameterizedTest @ValueSource(strings={"{}","{\"requestId\":\"id\",\"statusCode\":\"202\",\"statusName\":\"fail\"}","not-json"})
    void rejectsMissingConflictingOrInvalidProviderResponses(String body) {
        server.expect(requestTo("https://sens.apigw.ntruss.com"+PATH)).andRespond(withStatus(HttpStatus.ACCEPTED).contentType(MediaType.APPLICATION_JSON).body(body));
        assertThatThrownBy(()->sender.send("01000003001","654321")).isInstanceOfSatisfying(ResponseStatusException.class,e->assertThat(e.getStatusCode().value()).isEqualTo(503));server.verify();
    }
    @Test void providerErrorDoesNotExposeResponseDetailsOrPretendSuccess() {
        server.expect(requestTo("https://sens.apigw.ntruss.com"+PATH)).andRespond(withStatus(HttpStatus.TOO_MANY_REQUESTS).body("provider-private-detail"));
        assertThatThrownBy(()->sender.send("01000003001","654321")).isInstanceOf(ResponseStatusException.class).hasMessageNotContaining("provider-private-detail");server.verify();
    }
    @Test void absentCredentialsNeverSendAnHttpRequest() {
        when(props.sens()).thenReturn(new AppProperties.Sens("https://sens.apigw.ntruss.com","","","",""));
        assertThat(sender.isConfigured()).isFalse();assertThatThrownBy(()->sender.send("01000003001","654321")).isInstanceOf(ResponseStatusException.class);server.verify();
    }
}
