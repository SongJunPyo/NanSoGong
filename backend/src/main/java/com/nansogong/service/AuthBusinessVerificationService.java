package com.nansogong.service;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.nansogong.common.AppProperties;
import com.nansogong.dto.AuthBusinessVerificationRequest;
import com.nansogong.dto.AuthBusinessVerificationResponse;
import com.nansogong.dto.AuthBusinessVerificationResponse.Status;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.List;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;

/** 국세청의 진위·영업 상태를 확인한다. 회원·매장을 저장하거나 가입 권한을 발급하지 않는다. */
@Service
public class AuthBusinessVerificationService {

    private final RestClient ntsRestClient;
    private final String serviceKey;

    public AuthBusinessVerificationService(@Qualifier("ntsRestClient") RestClient ntsRestClient, AppProperties props) {
        this.ntsRestClient = ntsRestClient;
        this.serviceKey = props.external().dataGoKrServiceKey();
    }

    public AuthBusinessVerificationResponse verify(AuthBusinessVerificationRequest request) {
        return verifyAll(List.of(request)).getFirst();
    }

    /** 가입의 여러 사업자를 한 요청으로 확인한다. 외부 API의 최대 100건 제한을 따른다. */
    public List<AuthBusinessVerificationResponse> verifyAll(List<AuthBusinessVerificationRequest> requests) {
        if (requests.isEmpty() || requests.size() > 100) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "사업자는 한 번에 1~100개 확인할 수 있어요");
        }
        List<AuthNtsBusinessRequest> businesses = new ArrayList<>();
        for (AuthBusinessVerificationRequest request : requests) {
            try {
                LocalDate.parse(request.openingDate(), DateTimeFormatter.BASIC_ISO_DATE);
            } catch (DateTimeParseException e) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "개업일자는 실제 존재하는 날짜를 YYYYMMDD 형식으로 입력해 주세요");
            }
            businesses.add(new AuthNtsBusinessRequest(request.bizRegNo(), request.openingDate(), request.ownerName().strip()));
        }
        if (new HashSet<>(businesses.stream().map(AuthNtsBusinessRequest::bizRegNo).toList()).size() != businesses.size()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "같은 사업자등록번호를 두 번 확인할 수 없어요");
        }
        AuthNtsVerificationResponse response;
        try {
            response = ntsRestClient.post()
                    .uri(uri -> uri.path("/validate")
                            .queryParam("serviceKey", "{serviceKey}")
                            .queryParam("returnType", "JSON")
                            .build(serviceKey))
                    .contentType(MediaType.APPLICATION_JSON)
                    .accept(MediaType.APPLICATION_JSON)
                    .body(new AuthNtsVerificationRequest(businesses))
                    .retrieve()
                    .body(AuthNtsVerificationResponse.class);
        } catch (RestClientException e) {
            // 외부 예외·응답에는 인증키와 개인정보가 있을 수 있으므로 로그·응답·cause에 넣지 않는다.
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "국세청 진위확인에 실패했어요. 잠시 후 다시 시도해 주세요");
        }

        if (response == null || !"OK".equals(response.statusCode())
                || !Integer.valueOf(businesses.size()).equals(response.requestCount())
                || response.data() == null || response.data().size() != businesses.size()) {
            throw invalidResponse();
        }
        Map<String, AuthNtsVerificationResult> results = new HashMap<>();
        int validCount = 0;
        for (AuthNtsVerificationResult result : response.data()) {
            if (result == null || result.bizRegNo() == null || results.put(result.bizRegNo(), result) != null) throw invalidResponse();
            if ("01".equals(result.valid())) validCount++;
            else if (!"02".equals(result.valid())) throw invalidResponse();
        }
        if (response.validCount() != null && response.validCount() != validCount) throw invalidResponse();
        return businesses.stream().map(business -> checkedResult(business, results.get(business.bizRegNo()))).toList();
    }

    private AuthBusinessVerificationResponse checkedResult(AuthNtsBusinessRequest business, AuthNtsVerificationResult result) {
        if (result == null) {
            throw invalidResponse();
        }
        if ("02".equals(result.valid())) {
            // 미등록·정보 불일치는 진위확인 불가다. 영업 상태조회 성공으로 대체하지 않는다.
            return new AuthBusinessVerificationResponse(business.bizRegNo(), Status.MISMATCH);
        }
        if (!"01".equals(result.valid())
                || !business.equals(result.requestParam()) || result.status() == null
                || !business.bizRegNo().equals(result.status().bizRegNo())
                || result.status().statusCode() == null) {
            throw invalidResponse();
        }
        Status status = switch (result.status().statusCode()) {
            case "01" -> Status.ACTIVE;
            case "02" -> Status.SUSPENDED;
            case "03" -> Status.CLOSED;
            default -> throw invalidResponse();
        };
        return new AuthBusinessVerificationResponse(business.bizRegNo(), status);
    }

    private ResponseStatusException invalidResponse() {
        return new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                "국세청 진위확인 결과를 확인할 수 없어요. 잠시 후 다시 시도해 주세요");
    }

    private record AuthNtsVerificationRequest(List<AuthNtsBusinessRequest> businesses) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record AuthNtsBusinessRequest(
            @JsonProperty("b_no") String bizRegNo,
            @JsonProperty("start_dt") String openingDate,
            @JsonProperty("p_nm") String ownerName
    ) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record AuthNtsVerificationResponse(
            @JsonProperty("status_code") String statusCode,
            @JsonProperty("request_cnt") Integer requestCount,
            @JsonProperty("valid_cnt") Integer validCount,
            List<AuthNtsVerificationResult> data
    ) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record AuthNtsVerificationResult(
            @JsonProperty("b_no") String bizRegNo,
            String valid,
            @JsonProperty("request_param") AuthNtsBusinessRequest requestParam,
            AuthNtsBusinessStatus status
    ) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record AuthNtsBusinessStatus(
            @JsonProperty("b_no") String bizRegNo,
            @JsonProperty("b_stt_cd") String statusCode
    ) {}
}
