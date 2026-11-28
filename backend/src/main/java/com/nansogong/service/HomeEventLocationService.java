package com.nansogong.service;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.nansogong.dto.HomeEventCoordinates;
import com.nansogong.exception.HomeEventLookupException;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** 매장 표·날씨 도메인을 변경하지 않고 기존 카카오 클라이언트로 WGS84 좌표를 읽는다. */
@Service
public class HomeEventLocationService {
    private final RestClient kakao;
    private final Map<String, CachedLocation> cache = new LinkedHashMap<>(16, 0.75f, true);

    public HomeEventLocationService(@Qualifier("kakaoRestClient") RestClient kakao) { this.kakao = kakao; }

    public HomeEventCoordinates locate(String address) {
        if (address == null || address.isBlank()) throw new HomeEventLookupException(HttpStatus.CONFLICT,
                "STORE_ADDRESS_REQUIRED", "첫 매장 설정에서 주소를 먼저 등록해 주세요");
        String query = address.strip();
        Instant now = Instant.now();
        HomeEventCoordinates cached = cached(query, now);
        if (cached != null) return cached;
        KakaoResponse response;
        try {
            response = kakao.get().uri(uri -> uri.path("/v2/local/search/address.json")
                            .queryParam("query", "{query}").queryParam("analyze_type", "exact").build(query))
                    .accept(MediaType.APPLICATION_JSON).retrieve().body(KakaoResponse.class);
        } catch (RestClientException error) {
            throw new HomeEventLookupException(HttpStatus.SERVICE_UNAVAILABLE, "EVENT_LOCATION_UNAVAILABLE",
                    "매장 위치를 조회할 수 없어요. 잠시 후 다시 시도해 주세요");
        }
        if (response == null || response.meta() == null || response.meta().totalCount() == null || response.documents() == null) throw invalid();
        int total = response.meta().totalCount();
        if (total < 0 || total < response.documents().size() || total > 0 && response.documents().isEmpty()) throw invalid();
        if (total == 0) throw new HomeEventLookupException(HttpStatus.UNPROCESSABLE_CONTENT, "STORE_ADDRESS_NOT_FOUND", "매장 주소를 찾을 수 없어요");
        if (total != 1 || response.documents().size() != 1) throw new HomeEventLookupException(HttpStatus.UNPROCESSABLE_CONTENT,
                "STORE_ADDRESS_AMBIGUOUS", "매장 위치를 하나로 확인할 수 없어요. 정확한 도로명 주소를 입력해 주세요");
        KakaoDocument document = response.documents().getFirst();
        HomeEventCoordinates result;
        try {
            if (document == null) throw invalid();
            double longitude = Double.parseDouble(document.x());
            double latitude = Double.parseDouble(document.y());
            if (!Double.isFinite(longitude) || !Double.isFinite(latitude) || longitude == 0 || latitude == 0
                    || Math.abs(longitude) > 180 || Math.abs(latitude) > 90) throw invalid();
            result = new HomeEventCoordinates(latitude, longitude);
        } catch (NumberFormatException | NullPointerException error) { throw invalid(); }
        remember(query, result, now);
        return result;
    }

    private synchronized HomeEventCoordinates cached(String query, Instant now) {
        var cached = cache.get(query);
        if (cached == null) return null;
        if (!now.isBefore(cached.expiresAt())) { cache.remove(query); return null; }
        return cached.coordinates();
    }

    private synchronized void remember(String query, HomeEventCoordinates coordinates, Instant now) {
        cache.put(query, new CachedLocation(coordinates, now.plusSeconds(86_400)));
        if (cache.size() > 256) cache.remove(cache.keySet().iterator().next());
    }

    private HomeEventLookupException invalid() {
        return new HomeEventLookupException(HttpStatus.BAD_GATEWAY, "EVENT_INVALID_LOCATION", "매장 위치 조회 결과를 확인할 수 없어요");
    }

    private record CachedLocation(HomeEventCoordinates coordinates, Instant expiresAt) {}
    @JsonIgnoreProperties(ignoreUnknown = true)
    private record KakaoResponse(KakaoMeta meta, List<KakaoDocument> documents) {}
    @JsonIgnoreProperties(ignoreUnknown = true)
    private record KakaoMeta(@JsonProperty("total_count") Integer totalCount) {}
    @JsonIgnoreProperties(ignoreUnknown = true)
    private record KakaoDocument(String x, String y) {}
}
