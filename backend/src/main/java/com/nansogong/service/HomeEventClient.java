package com.nansogong.service;

import com.nansogong.common.AppProperties;
import com.nansogong.dto.HomeEventCoordinates;
import com.nansogong.exception.HomeEventLookupException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** 전국 월별 원천을 모두 읽은 뒤에만 캐시한다. 매장별 거리 필터는 service에서 수행한다. */
@Service
public class HomeEventClient {
    private static final int PAGE_SIZE = 1000;
    private static final int MAX_PAGES = 10;
    private static final int MAX_ROWS = 10_000;
    private final RestClient tour;
    private final String serviceKey;
    private final boolean mock;
    private final JsonMapper json;
    private final Clock clock;
    private final Map<YearMonth, MonthData> cache = new LinkedHashMap<>(16, 0.75f, true);

    @Autowired
    public HomeEventClient(@Qualifier("tourRestClient") RestClient tour, AppProperties props, JsonMapper json) {
        this(tour, props.external().dataGoKrServiceKey(), props.external().tourMock(), json, Clock.systemUTC());
    }

    HomeEventClient(RestClient tour, String serviceKey, boolean mock, JsonMapper json, Clock clock) {
        this.tour = tour;
        this.serviceKey = mock ? "mock-key" : serviceKey;
        this.mock = mock;
        this.json = json;
        this.clock = clock;
    }

    public MonthData lookup(YearMonth month) {
        MonthData cached = cached(month);
        if (cached != null) return cached;
        if (serviceKey == null || serviceKey.isBlank() || "mock-key".equals(serviceKey) && !mock) {
            throw new HomeEventLookupException(HttpStatus.SERVICE_UNAVAILABLE, "EVENT_NOT_CONFIGURED",
                    "행사 조회 인증 설정을 확인해 주세요");
        }
        MonthData data = fetch(month);
        remember(month, data);
        return data;
    }

    private MonthData fetch(YearMonth month) {
        var events = new ArrayList<EventData>();
        var identities = new HashSet<String>();
        int unlocated = 0;
        int total = -1;
        int pageSize = -1;
        int seen = 0;
        for (int page = 1; page <= MAX_PAGES; page++) {
            JsonNode response = request(month, page).path("response");
            JsonNode code = response.path("header").path("resultCode");
            if (!code.isString()) throw invalid();
            // 실제 TourAPI 응답의 성공 코드는 0000이다. 공휴일의 00과 혼동하지 않는다.
            if (!"0000".equals(code.asString())) throw unavailable();
            JsonNode body = response.path("body");
            int count = integer(body.path("totalCount"));
            int returnedSize = integer(body.path("numOfRows"));
            if (count > MAX_ROWS) throw limit();
            if (count < 0 || returnedSize < 1 || returnedSize > PAGE_SIZE || integer(body.path("pageNo")) != page) throw invalid();
            if ((count + returnedSize - 1) / returnedSize > MAX_PAGES) throw limit();
            if (total == -1) { total = count; pageSize = returnedSize; }
            if (count != total || returnedSize != pageSize) throw invalid();
            List<JsonNode> rows = rows(body.path("items"));
            if (rows.size() > pageSize || seen + rows.size() > total || (total > 0 && rows.isEmpty())) throw invalid();
            for (JsonNode row : rows) {
                String id = required(row.path("contentid"));
                String title = required(row.path("title"));
                if (!id.matches("[0-9]+") || !identities.add(id) || !"15".equals(required(row.path("contenttypeid")))) throw invalid();
                LocalDate start = date(row.path("eventstartdate"));
                LocalDate end = date(row.path("eventenddate"));
                if (end.isBefore(start)) throw invalid();
                // 이전 달에 시작하거나 다음 달에 끝나는 행사도 조회 월과 겹치면 포함한다.
                if (end.isBefore(month.atDay(1)) || start.isAfter(month.atEndOfMonth())) continue;
                HomeEventCoordinates coordinates = coordinates(row);
                if (coordinates == null) { unlocated++; continue; }
                String address = (optional(row.path("addr1")) + " " + optional(row.path("addr2"))).strip();
                events.add(new EventData(id, title, start, end, address, coordinates));
            }
            seen += rows.size();
            if (seen == total) return new MonthData(List.copyOf(events), unlocated, clock.instant(), mock);
            if (rows.size() != pageSize) throw invalid();
        }
        throw limit();
    }

    private JsonNode request(YearMonth month, int page) {
        byte[] body;
        try {
            body = tour.get().uri(uri -> uri.pathSegment("searchFestival2")
                            .queryParam("serviceKey", "{key}").queryParam("MobileOS", "ETC").queryParam("MobileApp", "NanSoGong")
                            .queryParam("eventStartDate", month.atDay(1).format(DateTimeFormatter.BASIC_ISO_DATE))
                            .queryParam("eventEndDate", month.atEndOfMonth().format(DateTimeFormatter.BASIC_ISO_DATE))
                            .queryParam("arrange", "A").queryParam("numOfRows", PAGE_SIZE).queryParam("pageNo", page)
                            .queryParam("_type", "json").build(serviceKey))
                    .accept(MediaType.APPLICATION_JSON).retrieve().body(byte[].class);
        } catch (RestClientException error) {
            // 공급자 URL·본문·cause에는 키가 있을 수 있어 전달하거나 로그에 남기지 않는다.
            throw unavailable();
        }
        if (body == null || body.length == 0) throw invalid();
        try {
            JsonNode result = json.readTree(body);
            if (result == null || !result.isObject()) throw invalid();
            return result;
        } catch (JacksonException error) { throw invalid(); }
    }

    private HomeEventCoordinates coordinates(JsonNode row) {
        String x = optional(row.path("mapx"));
        String y = optional(row.path("mapy"));
        // 공급자가 미제공한 좌표를 매장 위치나 0,0으로 채우지 않는다.
        if (x.isBlank() || y.isBlank()) return null;
        try {
            double longitude = Double.parseDouble(x);
            double latitude = Double.parseDouble(y);
            if (!Double.isFinite(longitude) || !Double.isFinite(latitude)
                    || Math.abs(longitude) > 180 || Math.abs(latitude) > 90) throw invalid();
            if (longitude == 0 || latitude == 0) return null;
            return new HomeEventCoordinates(latitude, longitude);
        } catch (NumberFormatException error) { throw invalid(); }
    }

    private LocalDate date(JsonNode node) {
        String value = required(node);
        if (!value.matches("[0-9]{8}")) throw invalid();
        try { return LocalDate.parse(value, DateTimeFormatter.BASIC_ISO_DATE); }
        catch (java.time.DateTimeException error) { throw invalid(); }
    }

    private List<JsonNode> rows(JsonNode items) {
        if (items.isMissingNode() || items.isNull() || items.isString() && items.asString().isBlank()) return List.of();
        if (!items.isObject()) throw invalid();
        JsonNode item = items.path("item");
        if (item.isMissingNode() || item.isNull()) return List.of();
        if (item.isObject()) return List.of(item);
        if (!item.isArray()) throw invalid();
        var result = new ArrayList<JsonNode>();
        item.forEach(result::add);
        return result;
    }

    private int integer(JsonNode node) {
        if (!node.isIntegralNumber() || !node.canConvertToInt()) throw invalid();
        return node.intValue();
    }

    private String required(JsonNode node) {
        if (!node.isString() || node.asString().isBlank()) throw invalid();
        return node.asString().strip();
    }

    private String optional(JsonNode node) {
        if (node.isMissingNode() || node.isNull()) return "";
        if (!node.isString()) throw invalid();
        return node.asString().strip();
    }

    private synchronized MonthData cached(YearMonth month) {
        MonthData data = cache.get(month);
        if (data != null && !clock.instant().isBefore(data.fetchedAt().plusSeconds(21_600))) {
            cache.remove(month); return null;
        }
        return data;
    }

    private synchronized void remember(YearMonth month, MonthData data) {
        cache.put(month, data);
        if (cache.size() > 24) cache.remove(cache.keySet().iterator().next());
    }

    private HomeEventLookupException invalid() {
        return new HomeEventLookupException(HttpStatus.BAD_GATEWAY, "EVENT_INVALID_RESPONSE", "행사 조회 결과를 확인할 수 없어요");
    }

    private HomeEventLookupException unavailable() {
        return new HomeEventLookupException(HttpStatus.SERVICE_UNAVAILABLE, "EVENT_UNAVAILABLE", "행사 조회가 지연되고 있어요. 잠시 후 다시 시도해 주세요");
    }

    private HomeEventLookupException limit() {
        return new HomeEventLookupException(HttpStatus.SERVICE_UNAVAILABLE, "EVENT_RESULT_LIMIT_EXCEEDED", "행사 정보가 조회 한도를 초과했어요");
    }

    public record EventData(String externalId, String title, LocalDate startDate, LocalDate endDate,
                            String address, HomeEventCoordinates coordinates) {}
    public record MonthData(List<EventData> events, int unlocatedEventCount, Instant fetchedAt, boolean mock) {}
}
