package com.nansogong.service;

import com.nansogong.exception.HomeHolidayLookupException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;
import tools.jackson.databind.json.JsonMapper;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.queryParam;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

class HomeHolidayClientTest {
    private static final JsonMapper JSON = JsonMapper.builder().build();
    private static final YearMonth DECEMBER = YearMonth.of(2026, 12);
    private MockRestServiceServer server;
    private MutableClock clock;
    private HomeHolidayClient client;

    @BeforeEach void setup() {
        var builder = RestClient.builder().baseUrl("https://holiday.test/service");
        server = MockRestServiceServer.bindTo(builder).build();
        clock = new MutableClock();
        client = new HomeHolidayClient(builder.build(), "key+with/slash=", false, JSON, clock);
    }

    @Test void parsesTheObservedSingleObjectAndEncodesTheOriginalKeyOnce() {
        server.expect(request -> {
            assertThat(request.getURI().getPath()).isEqualTo("/service/getRestDeInfo");
            assertThat(request.getURI().getRawQuery()).contains("serviceKey=key%2Bwith%2Fslash%3D");
        }).andExpect(queryParam("solYear", "2026")).andExpect(queryParam("solMonth", "12"))
                .andExpect(queryParam("_type", "json")).andExpect(queryParam("numOfRows", "100"))
                .andRespond(withSuccess(envelope(row(20261225, "기독탄신일", "Y", 1), 1, 100, 1), MediaType.APPLICATION_JSON));
        var data = client.lookup(DECEMBER);
        assertThat(data.mock()).isFalse();
        assertThat(data.fetchedAt()).isEqualTo(clock.instant());
        assertThat(data.holidays()).singleElement().satisfies(holiday -> {
            assertThat(holiday.date()).isEqualTo(LocalDate.of(2026, 12, 25));
            assertThat(holiday.name()).isEqualTo("기독탄신일");
        });
        server.verify();
    }

    @Test void normalizesArraysFiltersNonHolidaysAndPreservesDifferentNamesOnTheSameDate() {
        var rows = List.of(row("20260302", "대체공휴일", "Y", 1), row(20260301, "삼일절", "Y", 1),
                row(20260302, "다른 공휴일 예시", "Y", 2), row(20260303, "기념일 예시", "N", 1));
        server.expect(queryParam("solMonth", "03")).andRespond(withSuccess(envelope(rows, 4, 100, 1), MediaType.APPLICATION_JSON));
        var holidays = client.lookup(YearMonth.of(2026, 3)).holidays();
        assertThat(holidays).hasSize(3);
        assertThat(holidays.getFirst().name()).isEqualTo("삼일절");
        assertThat(holidays.stream().filter(h -> h.date().equals(LocalDate.of(2026, 3, 2)))).hasSize(2);
    }

    @ParameterizedTest
    @ValueSource(strings = {"\"\"", "null", "{}", "{\"item\":[]}", "{\"item\":null}"})
    void explicitZeroCountAcceptsTheSupportedEmptyShapes(String items) {
        String body = """
                {"response":{"header":{"resultCode":"00"},"body":{"items":%s,"totalCount":0,"numOfRows":100,"pageNo":1}}}
                """.formatted(items);
        server.expect(queryParam("pageNo", "1")).andRespond(withSuccess(body, MediaType.APPLICATION_JSON));
        assertThat(client.lookup(DECEMBER).holidays()).isEmpty();
    }

    @Test void readsEveryProviderPageBeforeReturningOrCaching() {
        server.expect(queryParam("pageNo", "1")).andRespond(withSuccess(envelope(
                List.of(row(20261201, "첫째", "Y", 1), row(20261202, "둘째", "Y", 1)), 3, 2, 1), MediaType.APPLICATION_JSON));
        server.expect(queryParam("pageNo", "2")).andRespond(withSuccess(envelope(row(20261203, "셋째", "Y", 1), 3, 2, 2), MediaType.APPLICATION_JSON));
        assertThat(client.lookup(DECEMBER).holidays()).hasSize(3);
        server.verify();
    }

    @Test void successfulResultsIncludingZeroAreCachedUntilExpiry() {
        server.expect(queryParam("solMonth", "12")).andRespond(withSuccess(envelope(null, 0, 100, 1), MediaType.APPLICATION_JSON));
        server.expect(queryParam("solMonth", "12")).andRespond(withSuccess(envelope(row(20261225, "기독탄신일", "Y", 1), 1, 100, 1), MediaType.APPLICATION_JSON));
        Instant firstFetch = client.lookup(DECEMBER).fetchedAt();
        clock.advance(Duration.ofHours(5));
        assertThat(client.lookup(DECEMBER).holidays()).isEmpty();
        assertThat(client.lookup(DECEMBER).fetchedAt()).isEqualTo(firstFetch);
        clock.advance(Duration.ofHours(1));
        assertThat(client.lookup(DECEMBER).holidays()).hasSize(1);
        server.verify();
    }

    @Test void secondPageFailureNeverReturnsOrCachesPartialData() {
        server.expect(queryParam("pageNo", "1")).andRespond(withSuccess(envelope(row(20261201, "첫째", "Y", 1), 2, 1, 1), MediaType.APPLICATION_JSON));
        server.expect(queryParam("pageNo", "2")).andRespond(withStatus(HttpStatus.SERVICE_UNAVAILABLE).body("upstream-secret"));
        server.expect(queryParam("pageNo", "1")).andRespond(withSuccess(envelope(row(20261225, "기독탄신일", "Y", 1), 1, 100, 1), MediaType.APPLICATION_JSON));
        assertThatThrownBy(() -> client.lookup(DECEMBER)).isInstanceOfSatisfying(HomeHolidayLookupException.class, error -> {
            assertThat(error.getCode()).isEqualTo("HOLIDAY_UNAVAILABLE");
            assertThat(error.getCause()).isNull();
            assertThat(error.toString()).doesNotContain("upstream-secret", "key+with", "holiday.test");
        });
        assertThat(client.lookup(DECEMBER).holidays()).hasSize(1);
    }

    @Test void providerErrorCodeIsAnErrorNotAnEmptyHolidayList() {
        server.expect(queryParam("pageNo", "1")).andRespond(withSuccess(
                "{\"response\":{\"header\":{\"resultCode\":\"30\",\"resultMsg\":\"secret-provider-details\"}}}", MediaType.APPLICATION_JSON));
        assertThatThrownBy(() -> client.lookup(DECEMBER)).isInstanceOfSatisfying(HomeHolidayLookupException.class, error -> {
            assertThat(error.getStatusCode()).isEqualTo(HttpStatus.SERVICE_UNAVAILABLE);
            assertThat(error.getCode()).isEqualTo("HOLIDAY_UNAVAILABLE");
            assertThat(error.toString()).doesNotContain("secret-provider-details");
        });
    }

    @ParameterizedTest
    @ValueSource(strings = {"{}", "not-json", "<OpenAPI_ServiceResponse>upstream-secret</OpenAPI_ServiceResponse>",
            "{\"response\":{\"header\":{\"resultCode\":\"00\"}}}"})
    void malformedOrIncompleteResponsesNeverBecomeZero(String body) {
        server.expect(queryParam("pageNo", "1")).andRespond(withSuccess(body, MediaType.APPLICATION_JSON));
        assertInvalid();
    }

    @Test void rejectsDatesOutsideTheRequestedMonthAndUnknownHolidayFlags() {
        server.expect(queryParam("pageNo", "1")).andRespond(withSuccess(envelope(row(20261125, "잘못된 월", "Y", 1), 1, 100, 1), MediaType.APPLICATION_JSON));
        server.expect(queryParam("pageNo", "1")).andRespond(withSuccess(envelope(row(20261225, "확인 불가", "UNKNOWN", 1), 1, 100, 1), MediaType.APPLICATION_JSON));
        assertInvalid(); assertInvalid();
    }

    @Test void rejectsMismatchingCountsAndDuplicateProviderRows() {
        var row = row(20261225, "기독탄신일", "Y", 1);
        server.expect(queryParam("pageNo", "1")).andRespond(withSuccess(envelope(row, 0, 100, 1), MediaType.APPLICATION_JSON));
        server.expect(queryParam("pageNo", "1")).andRespond(withSuccess(envelope(List.of(row, row), 2, 100, 1), MediaType.APPLICATION_JSON));
        assertInvalid(); assertInvalid();
    }

    @Test void mockCallsNeverForwardTheConfiguredRealKey() {
        var builder = RestClient.builder().baseUrl("http://localhost/holiday");
        var mockServer = MockRestServiceServer.bindTo(builder).build();
        var mockClient = new HomeHolidayClient(builder.build(), "real-key-never-send", true, JSON, clock);
        mockServer.expect(queryParam("serviceKey", "mock-key")).andRespond(withSuccess(envelope(null, 0, 100, 1), MediaType.APPLICATION_JSON));
        assertThat(mockClient.lookup(DECEMBER).mock()).isTrue();
        mockServer.verify();
    }

    @Test void realModeWithPlaceholderKeyFailsBeforeAnyRequest() {
        var unconfigured = new HomeHolidayClient(RestClient.create("https://holiday.test"), "mock-key", false, JSON, clock);
        assertThatThrownBy(() -> unconfigured.lookup(DECEMBER)).isInstanceOfSatisfying(HomeHolidayLookupException.class,
                error -> assertThat(error.getCode()).isEqualTo("HOLIDAY_NOT_CONFIGURED"));
    }

    private void assertInvalid() {
        assertThatThrownBy(() -> client.lookup(DECEMBER)).isInstanceOfSatisfying(HomeHolidayLookupException.class, error -> {
            assertThat(error.getStatusCode()).isEqualTo(HttpStatus.BAD_GATEWAY);
            assertThat(error.getCode()).isEqualTo("HOLIDAY_INVALID_RESPONSE");
            assertThat(error.getCause()).isNull();
        });
    }

    private static Map<String, Object> row(Object date, String name, String flag, int seq) {
        return Map.of("dateKind", "01", "dateName", name, "isHoliday", flag, "locdate", date, "seq", seq);
    }

    private static String envelope(Object items, int total, int size, int page) {
        return JSON.writeValueAsString(Map.of("response", Map.of("header", Map.of("resultCode", "00"),
                "body", Map.of("items", items == null ? "" : Map.of("item", items), "totalCount", total, "numOfRows", size, "pageNo", page))));
    }

    private static final class MutableClock extends Clock {
        private Instant now = Instant.parse("2026-11-28T00:00:00Z");
        void advance(Duration duration) { now = now.plus(duration); }
        @Override public ZoneId getZone() { return ZoneOffset.UTC; }
        @Override public Clock withZone(ZoneId zone) { return this; }
        @Override public Instant instant() { return now; }
    }
}
