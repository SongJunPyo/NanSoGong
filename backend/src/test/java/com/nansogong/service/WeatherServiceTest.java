package com.nansogong.service;

import com.nansogong.common.AppProperties;
import com.nansogong.dto.StoreResponse;
import com.nansogong.dto.WeatherGrid;
import com.nansogong.exception.WeatherLookupException;
import org.junit.jupiter.api.Test;

import java.time.Duration;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;

class WeatherServiceTest {
    @Test void refusesMixedMockAndRealServicesBeforeExposingAnAddress() {
        StoreService stores = mock(StoreService.class);
        WeatherLocationService locations = mock(WeatherLocationService.class);
        WeatherForecastService forecasts = mock(WeatherForecastService.class);
        when(stores.getMine(1L, 2L)).thenReturn(store("서울 중구 세종대로 110"));
        var ext = new AppProperties.External("nts-key", "https://api.odcloud.kr", "https://apis.data.go.kr",
                "http://localhost/holiday", "http://localhost/naver", "mock", "mock", "http://localhost/pos",
                "http://localhost/supplier", "http://localhost/mydata", Duration.ofSeconds(3), Duration.ofSeconds(10),
                "http://localhost:8089/kakao", "kakao-key", "kma-key", "http://localhost:8089/tour");
        var props = mock(AppProperties.class);
        when(props.external()).thenReturn(ext);
        var service = new WeatherService(stores, locations, forecasts, props);
        assertThatThrownBy(() -> service.get(1L, 2L)).isInstanceOfSatisfying(WeatherLookupException.class,
                error -> org.assertj.core.api.Assertions.assertThat(error.getCode()).isEqualTo("WEATHER_CONFIGURATION_REQUIRED"));
        verify(stores).checkOwner(1L, 2L);
        verifyNoInteractions(locations, forecasts);
    }

    @Test void changedStoreAddressIsResolvedAgain() {
        StoreService stores = mock(StoreService.class);
        WeatherLocationService locations = mock(WeatherLocationService.class);
        WeatherForecastService forecasts = mock(WeatherForecastService.class);
        when(stores.getMine(1L, 2L)).thenReturn(store("서울 중구 세종대로 110"), store("부산 연제구 중앙대로 1001"));
        var ext = mock(AppProperties.External.class);
        when(ext.kakaoMock()).thenReturn(true); when(ext.kmaMock()).thenReturn(true);
        var props = mock(AppProperties.class); when(props.external()).thenReturn(ext);
        when(locations.locate(anyString())).thenReturn(new WeatherGrid(60, 127), new WeatherGrid(98, 76));
        var service = new WeatherService(stores, locations, forecasts, props);
        service.get(1L, 2L); service.get(1L, 2L);
        verify(locations).locate("서울 중구 세종대로 110");
        verify(locations).locate("부산 연제구 중앙대로 1001");
        verify(forecasts).lookup(new WeatherGrid(60, 127));
        verify(forecasts).lookup(new WeatherGrid(98, 76));
    }

    private StoreResponse store(String address) {
        return new StoreResponse(2L, 1L, null, null, null, null, null, null, "테스트", "카페", address,
                Map.of(), List.of(), Map.of());
    }
}
