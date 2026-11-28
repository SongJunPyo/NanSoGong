package com.nansogong.controller;

import com.nansogong.dto.HomeHolidayResponse;
import com.nansogong.service.HomeHolidayService;
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
@RequestMapping("/api/stores/{storeId}/home/holidays")
@RequiredArgsConstructor
public class HomeHolidayController {
    private final HomeHolidayService homeHolidayService;

    @GetMapping
    @Operation(summary = "내 매장의 홈에서 사용할 월별 공휴일 조회",
            description = "year·month는 필수입니다. 전국 공통 공휴일이며 매장 휴무일을 뜻하지 않습니다. mock=true는 개발용 예시입니다.")
    public HomeHolidayResponse get(@AuthenticationPrincipal Jwt jwt, @PathVariable Long storeId,
                                   @RequestParam int year, @RequestParam int month,
                                   @PageableDefault(size = 50, sort = "date") Pageable pageable) {
        return homeHolidayService.get(Long.valueOf(jwt.getSubject()), storeId, year, month, pageable);
    }
}
