package com.nansogong.service;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.nansogong.common.AppProperties;
import com.nansogong.dto.WeatherGrid;
import com.nansogong.dto.WeatherResponse.Forecast;
import com.nansogong.exception.WeatherLookupException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.format.ResolverStyle;
import java.time.temporal.ChronoUnit;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;

@Service
public class WeatherForecastService {
    private static final ZoneId SEOUL = ZoneId.of("Asia/Seoul");
    private static final DateTimeFormatter DATE = DateTimeFormatter.ofPattern("uuuuMMdd").withResolverStyle(ResolverStyle.STRICT);
    private static final DateTimeFormatter TIME = DateTimeFormatter.ofPattern("HHmm").withResolverStyle(ResolverStyle.STRICT);
    private static final int PAGE_SIZE = 1000;
    private static final int MAX_ROWS = 10_000;
    private final RestClient kma;
    private final String serviceKey;
    private final Clock clock;
    private final WeatherCache<ForecastKey, ForecastData> cache = new WeatherCache<>(128);

    @Autowired
    public WeatherForecastService(@Qualifier("kmaRestClient") RestClient kma, AppProperties props) {
        this(kma, props.external().kmaMock() ? "mock-key" : props.external().kmaServiceKey(), Clock.systemUTC());
    }

    WeatherForecastService(RestClient kma, String serviceKey, Clock clock) {
        this.kma = kma;
        this.serviceKey = serviceKey;
        this.clock = clock;
    }

    public Forecast lookup(WeatherGrid grid) {
        LocalDateTime now = LocalDateTime.ofInstant(clock.instant(), SEOUL);
        LocalDateTime base = latestBase(now);
        for (int attempt = 0; attempt < 2; attempt++, base = base.minusHours(3)) {
            var key = new ForecastKey(grid, base);
            ForecastData data = cache.get(key, clock.instant());
            if (data != null) return select(data, grid, now);
            data = fetch(grid, base);
            if (data == null) continue; // 기상청의 명확한 NO_DATA(03)일 때만 직전 발표분을 한 번 확인한다.
            Forecast forecast = select(data, grid, now);
            cache.put(key, data, data.fetchedAt().plusSeconds(600));
            return forecast;
        }
        throw new WeatherLookupException(HttpStatus.SERVICE_UNAVAILABLE, "WEATHER_NO_DATA",
                "아직 조회할 수 있는 날씨 예보가 없어요. 잠시 후 다시 시도해 주세요");
    }

    static LocalDateTime latestBase(LocalDateTime now) {
        // 02·05·08·11·14·17·20·23시 발표. 제공 지연을 고려해 20분 여유를 둔다.
        LocalDateTime available = now.minusMinutes(20);
        int hour = ((available.getHour() + 1) / 3) * 3 - 1;
        return hour < 0 ? available.toLocalDate().minusDays(1).atTime(23, 0)
                : available.toLocalDate().atTime(hour, 0);
    }

    private ForecastData fetch(WeatherGrid grid, LocalDateTime base) {
        var slots = new TreeMap<LocalDateTime, Map<String, String>>();
        int total = -1;
        int seen = 0;
        for (int page = 1; page <= 10; page++) {
            KmaEnvelope envelope = request(grid, base, page);
            if (envelope == null || envelope.response() == null || envelope.response().header() == null) throw invalid();
            var response = envelope.response();
            String resultCode = response.header().resultCode();
            if ("03".equals(resultCode) && page == 1) return null;
            if (!"00".equals(resultCode)) {
                throw new WeatherLookupException(HttpStatus.SERVICE_UNAVAILABLE, "WEATHER_UNAVAILABLE",
                        "기상청 날씨 조회가 지연되고 있어요. 잠시 후 다시 시도해 주세요");
            }
            KmaBody body = response.body();
            if (body == null || body.totalCount() == null || body.pageNo() == null || body.pageNo() != page
                    || body.numOfRows() == null || body.numOfRows() != PAGE_SIZE
                    || body.totalCount() < 1 || body.totalCount() > MAX_ROWS
                    || body.items() == null || body.items().item() == null) throw invalid();
            if (total == -1) total = body.totalCount();
            if (body.totalCount() != total) throw invalid();
            List<KmaItem> items = body.items().item();
            if (items.isEmpty() || items.size() > PAGE_SIZE || seen + items.size() > total) throw invalid();
            for (KmaItem item : items) {
                if (item == null || item.category() == null || item.fcstValue() == null
                        || !base.format(DATE).equals(item.baseDate()) || !base.format(TIME).equals(item.baseTime())
                        || !Integer.valueOf(grid.nx()).equals(item.nx()) || !Integer.valueOf(grid.ny()).equals(item.ny())) throw invalid();
                LocalDateTime at;
                try {
                    at = java.time.LocalDate.parse(item.fcstDate(), DATE).atTime(LocalTime.parse(item.fcstTime(), TIME));
                } catch (RuntimeException error) { throw invalid(); }
                if (!at.isAfter(base) || at.isAfter(base.plusDays(6))) throw invalid();
                String previous = slots.computeIfAbsent(at, ignored -> new HashMap<>()).putIfAbsent(item.category(), item.fcstValue());
                if (previous != null && !previous.equals(item.fcstValue())) throw invalid();
            }
            seen += items.size();
            if (seen == total) return new ForecastData(base, clock.instant(), slots);
            if (items.size() != PAGE_SIZE) throw invalid();
        }
        throw invalid();
    }

    private KmaEnvelope request(WeatherGrid grid, LocalDateTime base, int page) {
        try {
            return kma.get().uri(uri -> uri.path("/getVilageFcst")
                            // URI 변수로 원본 키의 +, /, =를 한 번만 인코딩한다.
                            .queryParam("serviceKey", "{key}").queryParam("pageNo", page)
                            .queryParam("numOfRows", PAGE_SIZE).queryParam("dataType", "JSON")
                            .queryParam("base_date", base.format(DATE)).queryParam("base_time", base.format(TIME))
                            .queryParam("nx", grid.nx()).queryParam("ny", grid.ny()).build(serviceKey))
                    .accept(MediaType.APPLICATION_JSON).retrieve().body(KmaEnvelope.class);
        } catch (RestClientException error) {
            // 원본 예외의 URL·본문에는 인증키가 있을 수 있다. 원문·cause를 보관하지 않는다.
            throw new WeatherLookupException(HttpStatus.SERVICE_UNAVAILABLE, "WEATHER_UNAVAILABLE",
                    "날씨를 조회할 수 없어요. 잠시 후 다시 시도해 주세요");
        }
    }

    private Forecast select(ForecastData data, WeatherGrid grid, LocalDateTime now) {
        LocalDateTime target = now.truncatedTo(ChronoUnit.HOURS);
        // TMN/TMX만 있는 시각은 시간별 예보가 아니다. TMP가 있는 가장 가까운 예보를 고른다.
        var selected = data.slots().tailMap(target).entrySet().stream()
                .filter(entry -> entry.getValue().containsKey("TMP")).findFirst().orElseThrow(this::invalid);
        if (selected.getKey().isAfter(target.plusHours(3))) throw invalid();
        Map<String, String> values = selected.getValue();
        try {
            BigDecimal temperature = new BigDecimal(values.get("TMP"));
            if (temperature.compareTo(BigDecimal.valueOf(-90)) < 0 || temperature.compareTo(BigDecimal.valueOf(60)) > 0) throw invalid();
            String sky = switch (Integer.parseInt(values.get("SKY"))) {
                case 1 -> "CLEAR";
                case 3 -> "PARTLY_CLOUDY";
                case 4 -> "CLOUDY";
                default -> throw invalid();
            };
            String precipitation = switch (Integer.parseInt(values.get("PTY"))) {
                case 0 -> "NONE";
                case 1 -> "RAIN";
                case 2 -> "RAIN_AND_SNOW";
                case 3 -> "SNOW";
                case 4 -> "SHOWERS";
                default -> throw invalid();
            };
            int probability = Integer.parseInt(values.get("POP"));
            if (probability < 0 || probability > 100) throw invalid();
            String amount = values.get("PCP"); // 누락은 null. '강수없음'·'1mm 미만'·구간 값은 원문을 유지한다.
            return new Forecast("FORECAST", data.base().atZone(SEOUL).toOffsetDateTime(),
                    selected.getKey().atZone(SEOUL).toOffsetDateTime(), data.fetchedAt(), grid.nx(), grid.ny(),
                    temperature, sky, precipitation, probability, amount);
        } catch (NumberFormatException | NullPointerException error) { throw invalid(); }
    }

    private WeatherLookupException invalid() {
        return new WeatherLookupException(HttpStatus.BAD_GATEWAY, "WEATHER_INVALID_RESPONSE",
                "날씨 조회 결과를 확인할 수 없어요. 잠시 후 다시 시도해 주세요");
    }

    private record ForecastKey(WeatherGrid grid, LocalDateTime base) {}
    private record ForecastData(LocalDateTime base, Instant fetchedAt, TreeMap<LocalDateTime, Map<String, String>> slots) {}
    @JsonIgnoreProperties(ignoreUnknown = true)
    private record KmaEnvelope(KmaResponse response) {}
    @JsonIgnoreProperties(ignoreUnknown = true)
    private record KmaResponse(KmaHeader header, KmaBody body) {}
    @JsonIgnoreProperties(ignoreUnknown = true)
    private record KmaHeader(String resultCode) {}
    @JsonIgnoreProperties(ignoreUnknown = true)
    private record KmaBody(KmaItems items, Integer pageNo, Integer numOfRows, Integer totalCount) {}
    @JsonIgnoreProperties(ignoreUnknown = true)
    private record KmaItems(List<KmaItem> item) {}
    @JsonIgnoreProperties(ignoreUnknown = true)
    private record KmaItem(String baseDate, String baseTime, String category, String fcstDate,
                           String fcstTime, String fcstValue, Integer nx, Integer ny) {}
}
