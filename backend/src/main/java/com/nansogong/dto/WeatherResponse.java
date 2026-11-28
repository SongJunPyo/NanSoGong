package com.nansogong.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.OffsetDateTime;

/** FORECAST는 관측 현재 기온이 아니라 forecastAt 시각의 예보다. */
public record WeatherResponse(Long storeId, String source, boolean mock, Forecast forecast) {
    public record Forecast(
            String kind, OffsetDateTime issuedAt, OffsetDateTime forecastAt, Instant fetchedAt,
            int nx, int ny, BigDecimal temperatureC, String sky, String precipitationType,
            int precipitationProbability, String precipitationAmount
    ) {}
}
