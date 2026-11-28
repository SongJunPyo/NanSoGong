package com.nansogong.service;

import com.nansogong.dto.WeatherGrid;
import com.nansogong.exception.WeatherLookupException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;
import tools.jackson.databind.json.JsonMapper;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.queryParam;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

class WeatherForecastServiceTest {
    private static final JsonMapper JSON = JsonMapper.builder().build();
    private static final WeatherGrid GRID = new WeatherGrid(60, 127);
    private MockRestServiceServer server;
    private WeatherForecastService service;
    private MutableClock clock;

    @BeforeEach void setup() {
        var builder = RestClient.builder().baseUrl("https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0");
        server = MockRestServiceServer.bindTo(builder).build();
        clock = new MutableClock();
        service = new WeatherForecastService(builder.build(), "test+key/value==", clock);
    }

    @Test void encodesTheOriginalKeyAndCachesTheSameGrid() {
        server.expect(requestTo(containsString("serviceKey=test%2Bkey%2Fvalue%3D%3D")))
                .andExpect(queryParam("base_date", "20261128")).andExpect(queryParam("base_time", "1400"))
                .andRespond(withSuccess(body(items("1400"), 1, 5), MediaType.APPLICATION_JSON));
        var result = service.lookup(GRID);
        assertThat(result.temperatureC()).isEqualByComparingTo("6");
        assertThat(result.forecastAt()).hasToString("2026-11-28T15:00+09:00");
        assertThat(result.kind()).isEqualTo("FORECAST");
        assertThat(result.sky()).isEqualTo("CLEAR");
        assertThat(result.precipitationProbability()).isZero();
        assertThat(service.lookup(GRID)).isEqualTo(result);
        server.verify();
    }

    @Test void readsAllPagesBeforeSelectingWeather() {
        List<Map<String, Object>> first = new ArrayList<>();
        first.add(items("1400").getFirst());
        for (int i = 1; i < 1000; i++) first.add(item("1400", "EXTRA" + i, "1"));
        server.expect(queryParam("pageNo", "1")).andRespond(withSuccess(body(first, 1, 1004), MediaType.APPLICATION_JSON));
        server.expect(queryParam("pageNo", "2")).andRespond(withSuccess(body(items("1400").subList(1, 5), 2, 1004), MediaType.APPLICATION_JSON));
        assertThat(service.lookup(GRID).sky()).isEqualTo("CLEAR");
        server.verify();
    }

    @Test void fallsBackOnlyOnceWhenTheLatestPublicationHasNoData() {
        server.expect(queryParam("base_time", "1400")).andRespond(withSuccess("{\"response\":{\"header\":{\"resultCode\":\"03\"}}}", MediaType.APPLICATION_JSON));
        server.expect(queryParam("base_time", "1100")).andRespond(withSuccess(body(items("1100"), 1, 5), MediaType.APPLICATION_JSON));
        assertThat(service.lookup(GRID).issuedAt()).hasToString("2026-11-28T11:00+09:00");
        server.verify();
    }

    @Test void anExpiredCacheIsRefreshedInsteadOfKeptForever() {
        server.expect(queryParam("base_time", "1400")).andRespond(withSuccess(body(items("1400"), 1, 5), MediaType.APPLICATION_JSON));
        server.expect(queryParam("base_time", "1400")).andRespond(withSuccess(body(items("1400"), 1, 5), MediaType.APPLICATION_JSON));
        service.lookup(GRID);
        clock.instant = clock.instant.plusSeconds(601);
        assertThat(service.lookup(GRID).fetchedAt()).isEqualTo(clock.instant());
        server.verify();
    }

    @ParameterizedTest
    @ValueSource(strings = {"SKY", "PTY", "POP", "TMP"})
    void missingRequiredWeatherNeverTurnsIntoZeroOrClear(String missing) {
        var rows = items("1400").stream().filter(row -> !missing.equals(row.get("category"))).toList();
        server.expect(queryParam("pageNo", "1")).andRespond(withSuccess(body(rows, 1, rows.size()), MediaType.APPLICATION_JSON));
        assertInvalid();
    }

    @Test void missingRainAmountRemainsUnknown() {
        var rows = items("1400").subList(0, 4);
        server.expect(queryParam("pageNo", "1")).andRespond(withSuccess(body(rows, 1, 4), MediaType.APPLICATION_JSON));
        assertThat(service.lookup(GRID).precipitationAmount()).isNull();
    }

    @ParameterizedTest
    @CsvSource({"SKY,2", "PTY,99", "POP,101", "TMP,999", "TMP,unknown"})
    void rejectsUnknownCodesAndImpossibleValues(String category, String value) {
        var rows = new ArrayList<>(items("1400"));
        rows.replaceAll(row -> category.equals(row.get("category")) ? item("1400", category, value) : row);
        server.expect(queryParam("pageNo", "1")).andRespond(withSuccess(body(rows, 1, 5), MediaType.APPLICATION_JSON));
        assertInvalid();
    }

    @Test void rejectsResponsesForAnotherGridOrAnOldPublication() {
        String response = body(items("1100"), 1, 5).replace("\"nx\":60", "\"nx\":61");
        server.expect(queryParam("pageNo", "1")).andRespond(withSuccess(response, MediaType.APPLICATION_JSON));
        assertInvalid();
    }

    @Test void upstreamErrorsDoNotLeakKeysOrBecomeSuccessfulWeather() {
        server.expect(queryParam("pageNo", "1")).andRespond(withStatus(HttpStatus.FORBIDDEN)
                .contentType(MediaType.APPLICATION_JSON).body("{\"secret\":\"test+key/value==\"}"));
        assertThatThrownBy(() -> service.lookup(GRID)).isInstanceOfSatisfying(WeatherLookupException.class, error -> {
            assertThat(error.getStatusCode().value()).isEqualTo(503);
            assertThat(error.getCode()).isEqualTo("WEATHER_UNAVAILABLE");
            assertThat(error.getMessage()).doesNotContain("test+key", "serviceKey", "secret");
            assertThat(error.getCause()).isNull();
        });
    }

    @ParameterizedTest
    @CsvSource({
            "2026-11-28T00:10,2026-11-27T23:00", "2026-11-28T02:19,2026-11-27T23:00",
            "2026-11-28T02:20,2026-11-28T02:00", "2026-11-28T11:19,2026-11-28T08:00",
            "2026-11-28T11:20,2026-11-28T11:00", "2027-01-01T00:00,2026-12-31T23:00"
    })
    void selectsAnAvailablePublicationAcrossMidnight(String now, String expected) {
        assertThat(WeatherForecastService.latestBase(LocalDateTime.parse(now))).isEqualTo(LocalDateTime.parse(expected));
    }

    @Test void convertsKakaoLongitudeAndLatitudeToTheSeoulGrid() {
        assertThat(WeatherGridConverter.convert(37.566370776634, 126.977918351844)).isEqualTo(GRID);
        assertThatThrownBy(() -> WeatherGridConverter.convert(126.977918351844, 37.566370776634)).isInstanceOf(WeatherLookupException.class);
        assertThatThrownBy(() -> WeatherGridConverter.convert(Double.NaN, 126.97)).isInstanceOf(WeatherLookupException.class);
    }

    private void assertInvalid() {
        assertThatThrownBy(() -> service.lookup(GRID)).isInstanceOfSatisfying(WeatherLookupException.class,
                error -> assertThat(error.getCode()).isEqualTo("WEATHER_INVALID_RESPONSE"));
    }

    private static List<Map<String, Object>> items(String baseTime) {
        return List.of(item(baseTime, "TMP", "6"), item(baseTime, "SKY", "1"), item(baseTime, "PTY", "0"),
                item(baseTime, "POP", "0"), item(baseTime, "PCP", "강수없음"));
    }

    private static Map<String, Object> item(String baseTime, String category, String value) {
        return Map.of("baseDate", "20261128", "baseTime", baseTime, "category", category,
                "fcstDate", "20261128", "fcstTime", "1500", "fcstValue", value, "nx", 60, "ny", 127);
    }

    private static String body(List<Map<String, Object>> rows, int page, int total) {
        return JSON.writeValueAsString(Map.of("response", Map.of("header", Map.of("resultCode", "00"),
                "body", Map.of("items", Map.of("item", rows), "pageNo", page, "numOfRows", 1000, "totalCount", total))));
    }

    private static class MutableClock extends Clock {
        private Instant instant = Instant.parse("2026-11-28T05:30:00Z");
        @Override public ZoneId getZone() { return ZoneOffset.UTC; }
        @Override public Clock withZone(ZoneId zone) { return this; }
        @Override public Instant instant() { return instant; }
    }
}
