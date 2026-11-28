package com.nansogong.service;

import com.nansogong.common.AppProperties;
import com.nansogong.dto.HomeEventResponse;
import com.nansogong.dto.HomeEventResponse.LocalEvent;
import com.nansogong.exception.HomeEventLookupException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.time.YearMonth;
import java.util.ArrayList;
import java.util.Comparator;

@Service
@RequiredArgsConstructor
public class HomeEventService {
    private final StoreService stores;
    private final HomeEventLocationService locations;
    private final HomeEventClient events;
    private final AppProperties props;

    public HomeEventResponse get(Long memberId, Long storeId, int year, int month, int radiusMeters, Pageable pageable) {
        // 원천·위치 캐시가 있어도 권한부터 확인한다. 외부 호출 동안 DB 트랜잭션은 유지하지 않는다.
        stores.checkOwner(memberId, storeId);
        if (year < 1000 || year > 9999 || month < 1 || month > 12 || radiusMeters < 1 || radiusMeters > 20_000) throw invalid();
        Comparator<LocalEvent> comparator = comparator(pageable.getSort());
        var store = stores.getMine(memberId, storeId);
        var external = props.external();
        if (external.kakaoMock() != external.tourMock()
                || !external.kakaoMock() && (external.kakaoRestApiKey() == null || external.kakaoRestApiKey().isBlank()
                || "mock-key".equals(external.kakaoRestApiKey()))) {
            throw new HomeEventLookupException(HttpStatus.SERVICE_UNAVAILABLE, "EVENT_CONFIGURATION_REQUIRED", "카카오·행사 연동 설정을 확인해 주세요");
        }
        var location = locations.locate(store.address());
        var data = events.lookup(YearMonth.of(year, month));
        var nearby = new ArrayList<LocalEvent>();
        for (var event : data.events()) {
            double distance = HomeEventDistance.meters(location, event.coordinates());
            // 필터에는 반올림 전 거리를 사용해 반경 바깥 행사를 포함하지 않는다.
            if (distance <= radiusMeters) nearby.add(new LocalEvent(event.externalId(), event.title(), event.startDate(),
                    event.endDate(), event.address(), event.coordinates().latitude(), event.coordinates().longitude(), Math.round(distance)));
        }
        nearby.sort(comparator);
        int from = (int) Math.min(pageable.getOffset(), nearby.size());
        int to = (int) Math.min((long) from + pageable.getPageSize(), nearby.size());
        return new HomeEventResponse(storeId, "TOUR_API", data.mock(), year, month, radiusMeters, data.fetchedAt(),
                data.unlocatedEventCount(), new PageImpl<>(nearby.subList(from, to), pageable, nearby.size()));
    }

    private Comparator<LocalEvent> comparator(Sort sort) {
        Comparator<LocalEvent> natural = Comparator.comparing(LocalEvent::startDate).thenComparing(LocalEvent::externalId);
        Comparator<LocalEvent> result = null;
        for (Sort.Order order : sort) {
            Comparator<LocalEvent> next = switch (order.getProperty()) {
                case "startDate" -> Comparator.comparing(LocalEvent::startDate);
                case "endDate" -> Comparator.comparing(LocalEvent::endDate);
                case "title" -> Comparator.comparing(LocalEvent::title);
                case "distanceMeters" -> Comparator.comparingLong(LocalEvent::distanceMeters);
                default -> throw invalid();
            };
            if (order.isDescending()) next = next.reversed();
            result = result == null ? next : result.thenComparing(next);
        }
        return result == null ? natural : result.thenComparing(natural);
    }

    private HomeEventLookupException invalid() {
        return new HomeEventLookupException(HttpStatus.BAD_REQUEST, "INVALID_REQUEST",
                "연도(네 자리)·월(1~12)·반경(1~20000m)과 정렬 기준을 확인해 주세요");
    }
}
