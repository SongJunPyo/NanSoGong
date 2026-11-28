package com.nansogong.service;

import com.nansogong.exception.HomeEventLookupException;
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
import java.time.Instant;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.queryParam;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

class HomeEventClientTest {
    private static final JsonMapper JSON = JsonMapper.builder().build();
    private static final YearMonth MONTH = YearMonth.of(2026, 12);
    private MockRestServiceServer server;
    private HomeEventClient client;
    private MutableClock clock;

    @BeforeEach void setup() {
        var builder = RestClient.builder().baseUrl("https://tour.test/service");
        server = MockRestServiceServer.bindTo(builder).build();
        clock = new MutableClock();
        client = new HomeEventClient(builder.build(), "original+key/value=", false, JSON, clock);
    }

    @Test void sendsTheMonthAndEncodesTheOriginalKeyOnceThenParsesTheObservedShape() {
        server.expect(request -> {
            assertThat(request.getURI().getPath()).isEqualTo("/service/searchFestival2");
            assertThat(request.getURI().getRawQuery()).contains("serviceKey=original%2Bkey%2Fvalue%3D");
        }).andExpect(queryParam("eventStartDate", "20261201")).andExpect(queryParam("eventEndDate", "20261231"))
                .andExpect(queryParam("MobileOS", "ETC")).andExpect(queryParam("MobileApp", "NanSoGong"))
                .andExpect(queryParam("_type", "json")).andExpect(queryParam("arrange", "A"))
                .andRespond(withSuccess(body(List.of(row("1")), 1, 1000, 1), MediaType.APPLICATION_JSON));
        var result = client.lookup(MONTH);
        assertThat(result.mock()).isFalse();
        assertThat(result.events()).singleElement().satisfies(event -> {
            assertThat(event.title()).isEqualTo("테스트 행사");
            assertThat(event.coordinates().longitude()).isEqualTo(126.9767);
            assertThat(event.coordinates().latitude()).isEqualTo(37.5716);
        });
        server.verify();
    }

    @Test void includesEventsStartingBeforeTheMonthAndEndingAfterTheMonth() {
        var ongoing = row("1"); ongoing.put("eventstartdate", "20260101"); ongoing.put("eventenddate", "20270110");
        var outside = row("2"); outside.put("eventstartdate", "20261101"); outside.put("eventenddate", "20261130");
        server.expect(queryParam("pageNo", "1")).andRespond(withSuccess(body(List.of(ongoing, outside), 2, 1000, 1), MediaType.APPLICATION_JSON));
        assertThat(client.lookup(MONTH).events()).singleElement().satisfies(event ->
                assertThat(event.startDate()).isEqualTo(LocalDate.of(2026, 1, 1)));
    }

    @Test void readsAllPagesAndNormalizesASingleObjectBeforeReturning() {
        server.expect(queryParam("pageNo", "1")).andRespond(withSuccess(body(List.of(row("1"), row("2")), 3, 2, 1), MediaType.APPLICATION_JSON));
        server.expect(queryParam("pageNo", "2")).andRespond(withSuccess(body(row("3"), 3, 2, 2), MediaType.APPLICATION_JSON));
        assertThat(client.lookup(MONTH).events()).hasSize(3);
        server.verify();
    }

    @Test void unknownCoordinatesAreCountedWithoutPretendingTheyAreAtTheStore() {
        var blank = row("1"); blank.put("mapx", "");
        var zero = row("2"); zero.put("mapx", "0"); zero.put("mapy", "0");
        var missing = row("3"); missing.remove("mapy");
        server.expect(queryParam("pageNo", "1")).andRespond(withSuccess(body(List.of(blank, zero, missing, row("4")), 4, 1000, 1), MediaType.APPLICATION_JSON));
        var result = client.lookup(MONTH);
        assertThat(result.unlocatedEventCount()).isEqualTo(3);
        assertThat(result.events()).singleElement().satisfies(event -> assertThat(event.externalId()).isEqualTo("4"));
    }

    @ParameterizedTest
    @ValueSource(strings = {"\"\"", "null", "{}", "{\"item\":[]}"})
    void explicitSuccessfulZeroCountRemainsAnEmptySuccess(String items) {
        String raw = "{\"response\":{\"header\":{\"resultCode\":\"0000\"},\"body\":{\"items\":%s,\"totalCount\":0,\"numOfRows\":1000,\"pageNo\":1}}}".formatted(items);
        server.expect(queryParam("pageNo", "1")).andRespond(withSuccess(raw, MediaType.APPLICATION_JSON));
        assertThat(client.lookup(MONTH).events()).isEmpty();
    }

    @Test void zeroCountIsCachedForSixHoursThenRefetched() {
        server.expect(queryParam("pageNo", "1")).andRespond(withSuccess(body(List.of(), 0, 1000, 1), MediaType.APPLICATION_JSON));
        server.expect(queryParam("pageNo", "1")).andRespond(withSuccess(body(row("1"), 1, 1000, 1), MediaType.APPLICATION_JSON));
        Instant fetchedAt = client.lookup(MONTH).fetchedAt();
        clock.now = clock.now.plusSeconds(21_599);
        assertThat(client.lookup(MONTH).fetchedAt()).isEqualTo(fetchedAt);
        clock.now = clock.now.plusSeconds(1);
        assertThat(client.lookup(MONTH).events()).hasSize(1);
        server.verify();
    }

    @Test void secondPageFailureDoesNotReturnOrCachePartialDataOrLeakTheKey() {
        server.expect(queryParam("pageNo", "1")).andRespond(withSuccess(body(row("1"), 2, 1, 1), MediaType.APPLICATION_JSON));
        server.expect(queryParam("pageNo", "2")).andRespond(withStatus(HttpStatus.FORBIDDEN).body("private-provider-response"));
        server.expect(queryParam("pageNo", "1")).andRespond(withSuccess(body(row("2"), 1, 1000, 1), MediaType.APPLICATION_JSON));
        assertThatThrownBy(() -> client.lookup(MONTH)).isInstanceOfSatisfying(HomeEventLookupException.class, error -> {
            assertThat(error.getCode()).isEqualTo("EVENT_UNAVAILABLE");
            assertThat(error.getCause()).isNull();
            assertThat(error.toString()).doesNotContain("original+key", "serviceKey", "private-provider-response", "tour.test");
        });
        assertThat(client.lookup(MONTH).events()).singleElement().satisfies(event -> assertThat(event.externalId()).isEqualTo("2"));
    }

    @ParameterizedTest
    @ValueSource(strings = {"00", "30"})
    void aDifferentResultCodeNeverBecomesAnEmptySuccess(String code) {
        server.expect(queryParam("pageNo", "1")).andRespond(withSuccess(
                "{\"response\":{\"header\":{\"resultCode\":\"" + code + "\",\"resultMsg\":\"provider-secret\"}}}", MediaType.APPLICATION_JSON));
        assertCode("EVENT_UNAVAILABLE");
    }

    @ParameterizedTest
    @ValueSource(strings = {"not-json", "<error>provider-secret</error>", "{}", "{\"response\":{\"header\":{\"resultCode\":\"0000\"}}}"})
    void malformedResponsesAreErrors(String raw) {
        server.expect(queryParam("pageNo", "1")).andRespond(withSuccess(raw, MediaType.APPLICATION_JSON));
        assertCode("EVENT_INVALID_RESPONSE");
    }

    @Test void rejectsDuplicateIdentitiesInconsistentCountsAndReversedDates() {
        server.expect(queryParam("pageNo", "1")).andRespond(withSuccess(body(List.of(row("1"), row("1")), 2, 1000, 1), MediaType.APPLICATION_JSON));
        server.expect(queryParam("pageNo", "1")).andRespond(withSuccess(body(row("1"), 0, 1000, 1), MediaType.APPLICATION_JSON));
        var reversed = row("1"); reversed.put("eventenddate", "20261130");
        server.expect(queryParam("pageNo", "1")).andRespond(withSuccess(body(reversed, 1, 1000, 1), MediaType.APPLICATION_JSON));
        assertCode("EVENT_INVALID_RESPONSE"); assertCode("EVENT_INVALID_RESPONSE"); assertCode("EVENT_INVALID_RESPONSE");
    }

    @ParameterizedTest
    @ValueSource(strings = {"NaN", "Infinity", "999", "not-a-number"})
    void invalidCoordinatesAreNotSilentlyOmitted(String longitude) {
        var invalid = row("1"); invalid.put("mapx", longitude);
        server.expect(queryParam("pageNo", "1")).andRespond(withSuccess(body(invalid, 1, 1000, 1), MediaType.APPLICATION_JSON));
        assertCode("EVENT_INVALID_RESPONSE");
    }

    @Test void refusesExcessivePaginationWithoutReturningPartialResults() {
        server.expect(queryParam("pageNo", "1")).andRespond(withSuccess(body(List.of(), 10001, 1000, 1), MediaType.APPLICATION_JSON));
        assertCode("EVENT_RESULT_LIMIT_EXCEEDED");
    }

    @Test void mockModeSendsOnlyAFakeKeyAndMissingRealKeyFailsBeforeHttp() {
        var builder = RestClient.builder().baseUrl("http://localhost/tour");
        var mockServer = MockRestServiceServer.bindTo(builder).build();
        var mockClient = new HomeEventClient(builder.build(), "real-secret", true, JSON, clock);
        mockServer.expect(queryParam("serviceKey", "mock-key")).andRespond(withSuccess(body(List.of(), 0, 1000, 1), MediaType.APPLICATION_JSON));
        assertThat(mockClient.lookup(MONTH).mock()).isTrue();
        mockServer.verify();
        var unconfigured = new HomeEventClient(RestClient.create("https://tour.test"), "mock-key", false, JSON, clock);
        assertThatThrownBy(() -> unconfigured.lookup(MONTH)).isInstanceOfSatisfying(HomeEventLookupException.class,
                error -> assertThat(error.getCode()).isEqualTo("EVENT_NOT_CONFIGURED"));
    }

    private void assertCode(String code) {
        assertThatThrownBy(() -> client.lookup(MONTH)).isInstanceOfSatisfying(HomeEventLookupException.class, error -> {
            assertThat(error.getCode()).isEqualTo(code);
            assertThat(error.getCause()).isNull();
        });
    }

    private static Map<String, Object> row(String id) {
        return new HashMap<>(Map.of("contentid", id, "contenttypeid", "15", "title", "테스트 행사", "eventstartdate", "20261201",
                "eventenddate", "20261231", "addr1", "서울 종로구", "mapx", "126.9767", "mapy", "37.5716"));
    }

    private static String body(Object rows, int count, int size, int page) {
        return JSON.writeValueAsString(Map.of("response", Map.of("header", Map.of("resultCode", "0000", "resultMsg", "OK"),
                "body", Map.of("items", Map.of("item", rows), "totalCount", count, "numOfRows", size, "pageNo", page))));
    }

    private static final class MutableClock extends Clock {
        private Instant now = Instant.parse("2026-11-28T00:00:00Z");
        @Override public ZoneId getZone() { return ZoneOffset.UTC; }
        @Override public Clock withZone(ZoneId zone) { return this; }
        @Override public Instant instant() { return now; }
    }
}
