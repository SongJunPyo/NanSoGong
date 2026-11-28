package com.nansogong.service;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.nansogong.dto.WeatherGrid;
import com.nansogong.exception.WeatherLookupException;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.time.Instant;
import java.util.List;

@Service
public class WeatherLocationService {
    private final RestClient kakao;
    private final WeatherCache<String, WeatherGrid> cache = new WeatherCache<>(256);

    public WeatherLocationService(@Qualifier("kakaoRestClient") RestClient kakao) { this.kakao = kakao; }

    public WeatherGrid locate(String address) {
        if (address == null || address.isBlank()) {
            throw new WeatherLookupException(HttpStatus.CONFLICT, "STORE_ADDRESS_REQUIRED", "첫 매장 설정에서 주소를 먼저 등록해 주세요");
        }
        String query = address.strip();
        Instant now = Instant.now();
        WeatherGrid cached = cache.get(query, now);
        if (cached != null) return cached;
        KakaoResponse response;
        try {
            response = kakao.get().uri(uri -> uri.path("/v2/local/search/address.json")
                            .queryParam("query", "{query}").queryParam("analyze_type", "exact").build(query))
                    .accept(MediaType.APPLICATION_JSON).retrieve().body(KakaoResponse.class);
        } catch (RestClientException error) {
            // URL에는 매장 주소, 헤더에는 키가 있다. 원본 예외를 로그·cause에 전달하지 않는다.
            throw new WeatherLookupException(HttpStatus.SERVICE_UNAVAILABLE, "WEATHER_LOCATION_UNAVAILABLE",
                    "매장 위치를 조회할 수 없어요. 잠시 후 다시 시도해 주세요");
        }
        if (response == null || response.meta() == null || response.meta().totalCount() == null
                || response.documents() == null) throw invalid();
        if (response.meta().totalCount() < 0
                || response.meta().totalCount() < response.documents().size()
                || (response.meta().totalCount() > 0 && response.documents().isEmpty())) throw invalid();
        if (response.meta().totalCount() == 0 && response.documents().isEmpty()) {
            throw new WeatherLookupException(HttpStatus.UNPROCESSABLE_CONTENT, "STORE_ADDRESS_NOT_FOUND",
                    "매장 주소를 찾을 수 없어요. 도로명 주소와 건물 번호를 확인해 주세요");
        }
        // 여러 후보 중 임의의 위치를 사용하지 않는다. 정확한 주소로 수정하도록 안내한다.
        if (response.meta().totalCount() != 1 || response.documents().size() != 1) {
            throw new WeatherLookupException(HttpStatus.UNPROCESSABLE_CONTENT, "STORE_ADDRESS_AMBIGUOUS",
                    "매장 위치를 하나로 확인할 수 없어요. 도로명 주소와 건물 번호를 확인해 주세요");
        }
        KakaoDocument document = response.documents().getFirst();
        if (document == null || document.x() == null || document.y() == null) throw invalid();
        WeatherGrid grid;
        try { grid = WeatherGridConverter.convert(Double.parseDouble(document.y()), Double.parseDouble(document.x())); }
        catch (NumberFormatException error) { throw invalid(); }
        cache.put(query, grid, now.plusSeconds(86_400));
        return grid;
    }

    private WeatherLookupException invalid() {
        return new WeatherLookupException(HttpStatus.BAD_GATEWAY, "WEATHER_INVALID_LOCATION", "매장 위치 조회 결과를 확인할 수 없어요");
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record KakaoResponse(KakaoMeta meta, List<KakaoDocument> documents) {}
    @JsonIgnoreProperties(ignoreUnknown = true)
    private record KakaoMeta(@com.fasterxml.jackson.annotation.JsonProperty("total_count") Integer totalCount) {}
    @JsonIgnoreProperties(ignoreUnknown = true)
    private record KakaoDocument(String x, String y) {}
}
