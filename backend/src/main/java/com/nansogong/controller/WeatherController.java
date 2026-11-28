package com.nansogong.controller;

import com.nansogong.dto.WeatherResponse;
import com.nansogong.service.WeatherService;
import io.swagger.v3.oas.annotations.Operation;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/stores/{storeId}/weather")
@RequiredArgsConstructor
public class WeatherController {
    private final WeatherService weatherService;

    @GetMapping
    @Operation(summary = "내 매장 주소 기준 시간별 날씨 예보", description = "forecastAt의 예보를 반환합니다. mock=true는 개발용 예시입니다.")
    public WeatherResponse get(@AuthenticationPrincipal Jwt jwt, @PathVariable Long storeId) {
        return weatherService.get(Long.valueOf(jwt.getSubject()), storeId);
    }
}
