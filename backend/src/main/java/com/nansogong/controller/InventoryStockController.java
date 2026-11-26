package com.nansogong.controller;

import com.nansogong.dto.InventoryInitialStockRequest;
import com.nansogong.dto.InventoryStockCountResponse;
import com.nansogong.dto.InventoryStockResponse;
import com.nansogong.service.InventoryStockService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/** 품목별 초기 재고 · 현재 추정 재고 (구현-3-2, 3-4, UF-09) */
@RestController
@RequestMapping("/api/stores/{storeId}/inventory-items/{itemId}")
@RequiredArgsConstructor
public class InventoryStockController {

    private final InventoryStockService inventoryStockService;

    /** 초기 재고 입력 (품목당 한 번) */
    @PostMapping("/initial-stock")
    @ResponseStatus(HttpStatus.CREATED)
    public InventoryStockCountResponse setInitialStock(@AuthenticationPrincipal Jwt jwt, @PathVariable Long storeId,
                                                       @PathVariable Long itemId,
                                                       @Valid @RequestBody InventoryInitialStockRequest request) {
        return inventoryStockService.setInitialStock(memberId(jwt), storeId, itemId, request);
    }

    /** 현재 추정 재고 */
    @GetMapping("/stock")
    public InventoryStockResponse stock(@AuthenticationPrincipal Jwt jwt, @PathVariable Long storeId,
                                        @PathVariable Long itemId) {
        return inventoryStockService.getStock(memberId(jwt), storeId, itemId);
    }

    private Long memberId(Jwt jwt) {
        return Long.valueOf(jwt.getSubject());   // 토큰의 subject = 회원 번호
    }
}
