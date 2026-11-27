package com.nansogong.service;

import com.nansogong.common.AppProperties;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.server.ResponseStatusException;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.util.Base64;
import java.util.List;
import java.util.Map;

/** Naver Cloud SENS 공식 SMS v2. 요청 접수와 휴대전화 인증 성공은 별개다. */
@Service
public class AuthSensSmsSender implements AuthSmsSender {
    private final RestClient client;
    private final AppProperties props;
    public AuthSensSmsSender(@Qualifier("sensRestClient") RestClient client, AppProperties props) {
        this.client = client; this.props = props;
    }
    @Override public boolean isConfigured() {
        var sens = props.sens();
        return props.verification().mode() == AppProperties.Verification.Mode.REAL
                && present(sens.accessKey()) && present(sens.secretKey())
                && sens.serviceId() != null && sens.serviceId().matches("ncp:sms:[A-Za-z0-9:_-]+")
                && sens.from() != null && sens.from().matches("[0-9]{8,11}");
    }
    @Override public void send(String phone, String code) {
        if (!isConfigured()) throw unavailable();
        String path = "/sms/v2/services/" + props.sens().serviceId() + "/messages";
        String timestamp = Long.toString(System.currentTimeMillis());
        try {
            var response = client.post().uri(path).contentType(MediaType.APPLICATION_JSON)
                    .header("x-ncp-apigw-timestamp", timestamp)
                    .header("x-ncp-iam-access-key", props.sens().accessKey())
                    .header("x-ncp-apigw-signature-v2", signature(path, timestamp))
                    .body(Map.of("type", "SMS", "contentType", "COMM", "countryCode", "82", "from", props.sens().from(),
                            "content", "[난소공] 인증번호 [" + code + "]를 입력해 주세요. 3분 이내 유효합니다.",
                            "messages", List.of(Map.of("to", phone))))
                    .retrieve().toEntity(AuthSensResponse.class);
            var body = response.getBody();
            if (response.getStatusCode().value() != 202 || body == null || !present(body.requestId())
                    || !"202".equals(body.statusCode()) || !"success".equals(body.statusName())) throw unavailable();
        } catch (RuntimeException failure) { throw unavailable(); }
    }
    private String signature(String path, String timestamp) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(props.sens().secretKey().getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            String input = "POST " + path + "\n" + timestamp + "\n" + props.sens().accessKey();
            return Base64.getEncoder().encodeToString(mac.doFinal(input.getBytes(StandardCharsets.UTF_8)));
        } catch (GeneralSecurityException failure) { throw unavailable(); }
    }
    private boolean present(String value) { return value != null && !value.isBlank(); }
    private ResponseStatusException unavailable() { return new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "문자 발송을 요청하지 못했어요. 설정을 확인하거나 잠시 후 다시 시도해 주세요"); }
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record AuthSensResponse(String requestId, String statusCode, String statusName) {}
}
