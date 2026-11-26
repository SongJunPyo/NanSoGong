package com.nansogong.controller;

import com.nansogong.dto.MenuCostResponse;
import com.nansogong.service.MenuCostService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.OffsetDateTime;

/** 메뉴 원가 (UF-15 ④) */
@RestController
@RequestMapping("/api/stores/{storeId}/menus/{menuId}/cost")
@RequiredArgsConstructor
public class MenuCostController {

    private final MenuCostService menuCostService;

    /** ?at=2025-06-01T00:00:00%2B09:00 를 주면 그 시점 레시피 · 단가 기준, 없으면 지금 */
    @GetMapping
    public MenuCostResponse cost(@AuthenticationPrincipal Jwt jwt, @PathVariable Long storeId, @PathVariable Long menuId,
                                 @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) OffsetDateTime at) {
        return menuCostService.getCost(Long.valueOf(jwt.getSubject()), storeId, menuId, at == null ? null : at.toInstant());
    }
}
