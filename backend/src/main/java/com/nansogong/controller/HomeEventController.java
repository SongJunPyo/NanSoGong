package com.nansogong.controller;

import com.nansogong.dto.HomeEventResponse;
import com.nansogong.service.HomeEventService;
import io.swagger.v3.oas.annotations.Operation;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/stores/{storeId}/home/local-events")
@RequiredArgsConstructor
public class HomeEventController {
    private final HomeEventService events;

    @GetMapping
    @Operation(summary = "내 매장 주변의 월별 축제·행사 조회",
            description = "year·month 필수, radiusMeters 기본 3000(최대 20000). 직선 거리이며 mock=true는 예시입니다. 좌표 미제공 행사는 unlocatedEventCount에 표시합니다.")
    public HomeEventResponse get(@AuthenticationPrincipal Jwt jwt, @PathVariable Long storeId,
                                 @RequestParam int year, @RequestParam int month,
                                 @RequestParam(defaultValue = "3000") int radiusMeters,
                                 @PageableDefault(size = 50, sort = "startDate") Pageable pageable) {
        return events.get(Long.valueOf(jwt.getSubject()), storeId, year, month, radiusMeters, pageable);
    }
}
