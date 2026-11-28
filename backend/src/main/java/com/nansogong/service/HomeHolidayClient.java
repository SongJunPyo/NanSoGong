package com.nansogong.service;

import com.nansogong.common.AppProperties;
import com.nansogong.dto.HomeHolidayResponse.Holiday;
import com.nansogong.exception.HomeHolidayLookupException;
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

import java.net.URI;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

/** 기존 holidayRestClient로 월별 공휴일을 조회한다. 오류 원문·인증키는 보관하거나 노출하지 않는다. */
@Service
public class HomeHolidayClient {
    private static final int PAGE_SIZE = 100;
    private static final int MAX_ROWS = 1_000;
    private static final int MAX_PAGES = 10;
    private static final int CACHE_MONTHS = 24;
    private static final Duration CACHE_TTL = Duration.ofHours(6);
    private final RestClient holiday;
    private final JsonMapper json;
    private final String serviceKey;
    private final boolean mock;
    private final Clock clock;
    private final Map<YearMonth, CachedMonth> cache = new LinkedHashMap<>(16, 0.75f, true);

    @Autowired
    public HomeHolidayClient(@Qualifier("holidayRestClient") RestClient holiday, AppProperties props, JsonMapper json) {
        this(holiday, props.external().dataGoKrServiceKey(), isMock(props.external().holidayBaseUrl()), json, Clock.systemUTC());
    }

    HomeHolidayClient(RestClient holiday, String serviceKey, boolean mock, JsonMapper json, Clock clock) {
        this.holiday = holiday;
        this.serviceKey = mock ? "mock-key" : serviceKey;
        this.mock = mock;
        this.json = json;
        this.clock = clock;
    }

    public MonthData lookup(YearMonth month) {
        MonthData cached = cached(month);
        if (cached != null) return cached;
        if (serviceKey == null || serviceKey.isBlank() || (!mock && "mock-key".equals(serviceKey))) {
            throw new HomeHolidayLookupException(HttpStatus.SERVICE_UNAVAILABLE, "HOLIDAY_NOT_CONFIGURED",
                    "공휴일 조회 인증 설정을 확인해 주세요");
        }
        MonthData result = fetch(month);
        remember(month, result);
        return result;
    }

    private MonthData fetch(YearMonth month) {
        List<Holiday> holidays = new ArrayList<>();
        Set<String> identities = new HashSet<>();
        int total = -1;
        int pageSize = -1;
        int seen = 0;
        for (int page = 1; page <= MAX_PAGES; page++) {
            JsonNode envelope = request(month, page);
            JsonNode response = envelope.path("response");
            JsonNode code = response.path("header").path("resultCode");
            if (!code.isString()) throw invalid();
            if (!"00".equals(code.asString())) throw unavailable();
            JsonNode body = response.path("body");
            int count = integer(body.path("totalCount"));
            int returnedSize = integer(body.path("numOfRows"));
            if (integer(body.path("pageNo")) != page || count < 0 || count > MAX_ROWS
                    || returnedSize < 1 || returnedSize > PAGE_SIZE
                    || (count + returnedSize - 1) / returnedSize > MAX_PAGES) throw invalid();
            if (total == -1) { total = count; pageSize = returnedSize; }
            if (count != total || returnedSize != pageSize) throw invalid();
            List<JsonNode> rows = rows(body.path("items"));
            if (total == 0) {
                if (!rows.isEmpty()) throw invalid();
                return new MonthData(List.of(), clock.instant(), mock);
            }
            if (rows.isEmpty() || rows.size() > pageSize || seen + rows.size() > total) throw invalid();
            for (JsonNode row : rows) {
                String name = text(row.path("dateName")).strip();
                String flag = text(row.path("isHoliday"));
                JsonNode dateNode = row.path("locdate");
                String rawDate = dateNode.isString() ? dateNode.asString()
                        : dateNode.isIntegralNumber() && dateNode.canConvertToInt() ? Integer.toString(dateNode.intValue()) : null;
                LocalDate date;
                try {
                    if (rawDate == null || !rawDate.matches("\\d{8}")) throw invalid();
                    date = LocalDate.parse(rawDate, DateTimeFormatter.BASIC_ISO_DATE);
                } catch (java.time.DateTimeException error) { throw invalid(); }
                int sequence = integer(row.path("seq"));
                if (name.isEmpty() || !YearMonth.from(date).equals(month) || sequence < 1
                        || !("Y".equals(flag) || "N".equals(flag))
                        || !identities.add(rawDate + ":" + sequence)) throw invalid();
                if ("Y".equals(flag)) holidays.add(new Holiday(date, name));
            }
            seen += rows.size();
            if (seen == total) {
                holidays.sort(Comparator.comparing(Holiday::date).thenComparing(Holiday::name));
                return new MonthData(List.copyOf(holidays), clock.instant(), mock);
            }
            if (rows.size() != pageSize) throw invalid();
        }
        throw invalid();
    }

    private JsonNode request(YearMonth month, int page) {
        byte[] body;
        try {
            body = holiday.get().uri(uri -> uri.pathSegment("getRestDeInfo")
                            // Decoding 원본 키를 URI 변수로 한 번만 인코딩한다. 목업에는 가짜 키만 보낸다.
                            .queryParam("serviceKey", "{key}").queryParam("solYear", month.getYear())
                            .queryParam("solMonth", "%02d".formatted(month.getMonthValue()))
                            .queryParam("pageNo", page).queryParam("numOfRows", PAGE_SIZE)
                            .queryParam("_type", "json").build(serviceKey))
                    .accept(MediaType.APPLICATION_JSON).retrieve().body(byte[].class);
        } catch (RestClientException error) {
            // 원본 예외에는 키가 포함된 URL·본문이 있을 수 있어 cause도 넘기지 않는다.
            throw unavailable();
        }
        // JSON은 원본 바이트로 파싱한다. Content-Type의 charset이 없어도 한글을 UTF-8로 읽는다.
        if (body == null || body.length == 0) throw invalid();
        try {
            JsonNode tree = json.readTree(body);
            if (tree == null || !tree.isObject()) throw invalid();
            return tree;
        } catch (JacksonException error) { throw invalid(); }
    }

    private List<JsonNode> rows(JsonNode items) {
        // 공급자는 0건일 때 items=""/누락, 1건은 객체, 여러 건은 배열을 반환할 수 있다.
        if (items.isMissingNode() || items.isNull() || (items.isString() && items.asString().isBlank())) return List.of();
        if (!items.isObject()) throw invalid();
        JsonNode item = items.path("item");
        if (item.isMissingNode() || item.isNull()) return List.of();
        if (item.isObject()) return List.of(item);
        if (!item.isArray()) throw invalid();
        List<JsonNode> result = new ArrayList<>();
        item.forEach(result::add);
        return result;
    }

    private int integer(JsonNode node) {
        if (!node.isIntegralNumber() || !node.canConvertToInt()) throw invalid();
        return node.intValue();
    }

    private String text(JsonNode node) {
        if (!node.isString()) throw invalid();
        return node.asString();
    }

    private synchronized MonthData cached(YearMonth month) {
        CachedMonth entry = cache.get(month);
        if (entry == null) return null;
        if (!clock.instant().isBefore(entry.expiresAt())) { cache.remove(month); return null; }
        return entry.data();
    }

    private synchronized void remember(YearMonth month, MonthData data) {
        cache.put(month, new CachedMonth(data, data.fetchedAt().plus(CACHE_TTL)));
        if (cache.size() > CACHE_MONTHS) cache.remove(cache.keySet().iterator().next());
    }

    private static boolean isMock(String baseUrl) {
        URI uri = URI.create(baseUrl);
        return uri.getHost() != null && List.of("localhost", "127.0.0.1", "mock", "::1", "[::1]").contains(uri.getHost())
                && ("/holiday".equals(uri.getPath()) || "/holiday/".equals(uri.getPath()));
    }

    private HomeHolidayLookupException invalid() {
        return new HomeHolidayLookupException(HttpStatus.BAD_GATEWAY, "HOLIDAY_INVALID_RESPONSE",
                "공휴일 조회 결과를 확인할 수 없어요. 잠시 후 다시 시도해 주세요");
    }

    private HomeHolidayLookupException unavailable() {
        return new HomeHolidayLookupException(HttpStatus.SERVICE_UNAVAILABLE, "HOLIDAY_UNAVAILABLE",
                "공휴일을 조회할 수 없어요. 잠시 후 다시 시도해 주세요");
    }

    public record MonthData(List<Holiday> holidays, Instant fetchedAt, boolean mock) {}
    private record CachedMonth(MonthData data, Instant expiresAt) {}
}
