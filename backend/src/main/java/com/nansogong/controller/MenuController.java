package com.nansogong.controller;

import com.nansogong.dto.MenuOptionRequest;
import com.nansogong.dto.MenuOptionResponse;
import com.nansogong.dto.MenuRequest;
import com.nansogong.dto.MenuResponse;
import com.nansogong.dto.MenuSaleStatusRequest;
import com.nansogong.service.MenuService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/** 메뉴 · 옵션. 토큰 필요, 내 매장만 */
@RestController
@RequestMapping("/api/stores/{storeId}/menus")
@RequiredArgsConstructor
public class MenuController {

    private final MenuService menuService;

    @GetMapping
    public List<MenuResponse> menus(@AuthenticationPrincipal Jwt jwt, @PathVariable Long storeId) {
        return menuService.getMenus(memberId(jwt), storeId);
    }

    @GetMapping("/{menuId}")
    public MenuResponse menu(@AuthenticationPrincipal Jwt jwt, @PathVariable Long storeId, @PathVariable Long menuId) {
        return menuService.getMenu(memberId(jwt), storeId, menuId);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public MenuResponse create(@AuthenticationPrincipal Jwt jwt, @PathVariable Long storeId,
                               @Valid @RequestBody MenuRequest request) {
        return menuService.createMenu(memberId(jwt), storeId, request);
    }

    @PutMapping("/{menuId}")
    public MenuResponse update(@AuthenticationPrincipal Jwt jwt, @PathVariable Long storeId, @PathVariable Long menuId,
                               @Valid @RequestBody MenuRequest request) {
        return menuService.updateMenu(memberId(jwt), storeId, menuId, request);
    }

    @PatchMapping("/{menuId}/sale-status")
    public MenuResponse changeSaleStatus(@AuthenticationPrincipal Jwt jwt, @PathVariable Long storeId, @PathVariable Long menuId,
                                         @Valid @RequestBody MenuSaleStatusRequest request) {
        return menuService.changeSaleStatus(memberId(jwt), storeId, menuId, request.saleStatus());
    }

    @PostMapping("/{menuId}/options")
    @ResponseStatus(HttpStatus.CREATED)
    public MenuOptionResponse createOption(@AuthenticationPrincipal Jwt jwt, @PathVariable Long storeId, @PathVariable Long menuId,
                                           @Valid @RequestBody MenuOptionRequest request) {
        return menuService.createOption(memberId(jwt), storeId, menuId, request);
    }

    private Long memberId(Jwt jwt) {
        return Long.valueOf(jwt.getSubject());   // 토큰의 subject = 회원 번호
    }
}
