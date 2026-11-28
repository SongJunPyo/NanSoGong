package com.nansogong.service;

import com.nansogong.common.AppProperties;
import com.nansogong.dto.WeatherResponse;
import com.nansogong.exception.WeatherLookupException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class WeatherService {
    private final StoreService stores;
    private final WeatherLocationService locations;
    private final WeatherForecastService forecasts;
    private final AppProperties props;

    public WeatherResponse get(Long memberId, Long storeId) {
        stores.checkOwner(memberId, storeId); // 캐시가 있어도 권한 확인을 먼저 한다.
        var store = stores.getMine(memberId, storeId);
        var external = props.external();
        if (external.kakaoMock() != external.kmaMock()
                || (!external.kakaoMock() && (!ready(external.kakaoRestApiKey()) || !ready(external.kmaServiceKey())))) {
            throw new WeatherLookupException(HttpStatus.SERVICE_UNAVAILABLE, "WEATHER_CONFIGURATION_REQUIRED",
                    "날씨 연동 설정을 확인해 주세요");
        }
        var grid = locations.locate(store.address());
        return new WeatherResponse(storeId, "KMA", external.kmaMock(), forecasts.lookup(grid));
    }

    private boolean ready(String key) { return key != null && !key.isBlank() && !"mock-key".equals(key); }
}
