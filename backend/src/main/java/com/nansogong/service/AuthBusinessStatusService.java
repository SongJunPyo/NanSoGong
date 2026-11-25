package com.nansogong.service;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.nansogong.common.AppProperties;
import com.nansogong.dto.AuthBusinessStatusResponse;
import com.nansogong.dto.AuthBusinessStatusResponse.Status;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

/** 국세청 상태조회만 수행한다. 회원·매장을 저장하거나 확인 상태를 변경하지 않는다. */
@Service
public class AuthBusinessStatusService {

    private final RestClient ntsRestClient;
    private final String serviceKey;

    public AuthBusinessStatusService(@Qualifier("ntsRestClient") RestClient ntsRestClient, AppProperties props) {
        this.ntsRestClient = ntsRestClient;
        this.serviceKey = props.external().dataGoKrServiceKey();
    }

    public AuthBusinessStatusResponse lookup(String bizRegNo) {
        AuthNtsStatusResponse response;
        try {
            response = ntsRestClient.post()
                    // Decoding 키의 +, /, = 도 보존되도록 URI 변수로 인코딩한다.
                    .uri(uri -> uri.path("/status")
                            .queryParam("serviceKey", "{serviceKey}")
                            .queryParam("returnType", "JSON")
                            .build(serviceKey))
                    .contentType(MediaType.APPLICATION_JSON)
                    .accept(MediaType.APPLICATION_JSON)
                    .body(new AuthNtsStatusRequest(List.of(bizRegNo)))
                    .retrieve()
                    .body(AuthNtsStatusResponse.class);
        } catch (RestClientException e) {
            // 원본 예외에는 인증키가 포함된 URL·응답이 있을 수 있으므로 로그·응답·cause에 넣지 않는다.
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "국세청 조회에 실패했어요. 잠시 후 다시 시도해 주세요");
        }

        if (response == null || !"OK".equals(response.statusCode())
                || !Integer.valueOf(1).equals(response.requestCount())
                || response.data() == null || response.data().size() != 1) {
            throw invalidResponse();
        }
        AuthNtsBusinessStatus business = response.data().getFirst();
        if (business == null || !bizRegNo.equals(business.bizRegNo()) || business.statusCode() == null) {
            throw invalidResponse();
        }

        Status status = switch (business.statusCode()) {
            case "01" -> Status.ACTIVE;
            case "02" -> Status.SUSPENDED;
            case "03" -> Status.CLOSED;
            case "" -> {
                // 미등록 안내가 명확할 때만 NOT_FOUND. 누락·알 수 없는 응답을 정상으로 처리하지 않는다.
                if (!"".equals(business.taxTypeCode()) || business.taxType() == null
                        || !business.taxType().contains("등록되지 않은")) {
                    throw invalidResponse();
                }
                yield Status.NOT_FOUND;
            }
            default -> throw invalidResponse();
        };
        return new AuthBusinessStatusResponse(bizRegNo, status);
    }

    private ResponseStatusException invalidResponse() {
        return new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                "국세청 조회 결과를 확인할 수 없어요. 잠시 후 다시 시도해 주세요");
    }

    private record AuthNtsStatusRequest(@JsonProperty("b_no") List<String> businessNumbers) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record AuthNtsStatusResponse(
            @JsonProperty("status_code") String statusCode,
            @JsonProperty("request_cnt") Integer requestCount,
            List<AuthNtsBusinessStatus> data
    ) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record AuthNtsBusinessStatus(
            @JsonProperty("b_no") String bizRegNo,
            @JsonProperty("b_stt_cd") String statusCode,
            @JsonProperty("tax_type_cd") String taxTypeCode,
            @JsonProperty("tax_type") String taxType
    ) {}
}
