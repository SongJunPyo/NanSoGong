package com.nansogong.service;

import com.nansogong.dto.HomeHolidayResponse;
import com.nansogong.dto.HomeHolidayResponse.Holiday;
import com.nansogong.exception.HomeHolidayLookupException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.time.YearMonth;
import java.util.Comparator;

@Service
@RequiredArgsConstructor
public class HomeHolidayService {
    private final StoreService storeService;
    private final HomeHolidayClient holidayClient;

    public HomeHolidayResponse get(Long memberId, Long storeId, int year, int month, Pageable pageable) {
        // 전국 공통 캐시라도 매장 권한 확인을 건너뛰지 않는다. 외부 호출 중 DB 트랜잭션은 유지하지 않는다.
        storeService.checkOwner(memberId, storeId);
        if (year < 1000 || year > 9999 || month < 1 || month > 12) throw invalid();
        Comparator<Holiday> comparator = comparator(pageable.getSort());
        var data = holidayClient.lookup(YearMonth.of(year, month));
        var sorted = data.holidays().stream().sorted(comparator).toList();
        int from = (int) Math.min(pageable.getOffset(), sorted.size());
        int to = (int) Math.min((long) from + pageable.getPageSize(), sorted.size());
        return new HomeHolidayResponse(storeId, "KASI", data.mock(), year, month, data.fetchedAt(),
                new PageImpl<>(sorted.subList(from, to), pageable, sorted.size()));
    }

    private Comparator<Holiday> comparator(Sort sort) {
        Comparator<Holiday> natural = Comparator.comparing(Holiday::date).thenComparing(Holiday::name);
        Comparator<Holiday> result = null;
        for (Sort.Order order : sort) {
            Comparator<Holiday> next = switch (order.getProperty()) {
                case "date" -> Comparator.comparing(Holiday::date);
                case "name" -> Comparator.comparing(Holiday::name);
                default -> throw invalid();
            };
            if (order.isDescending()) next = next.reversed();
            result = result == null ? next : result.thenComparing(next);
        }
        return result == null ? natural : result.thenComparing(natural);
    }

    private HomeHolidayLookupException invalid() {
        return new HomeHolidayLookupException(HttpStatus.BAD_REQUEST, "INVALID_REQUEST",
                "연도(네 자리)·월(1~12)과 정렬 기준(date 또는 name)을 확인해 주세요");
    }
}
