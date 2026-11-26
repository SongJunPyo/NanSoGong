package com.nansogong.controller;

import com.nansogong.dto.InventoryStockAdjustmentRequest;
import com.nansogong.dto.InventoryStockCountRequest;
import com.nansogong.dto.InventoryStockCountResponse;
import com.nansogong.dto.InventoryStockResponse;
import com.nansogong.dto.InventoryTransactionResponse;
import com.nansogong.service.InventoryStockService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.time.OffsetDateTime;

/** 품목별 재고 수량: 초기 재고 · 실사 · 폐기 · 손실 · 추정 재고 (구현-3-2, 3-4, 3-6, UF-09 ~ 11) */
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
                                                       @Valid @RequestBody InventoryStockCountRequest request) {
        return inventoryStockService.setInitialStock(memberId(jwt), storeId, itemId, request);
    }

    /** 실사 등록. 응답의 difference = 실제 수량 − 그 시각 추정 재고 */
    @PostMapping("/stock-counts")
    @ResponseStatus(HttpStatus.CREATED)
    public InventoryStockCountResponse recordCount(@AuthenticationPrincipal Jwt jwt, @PathVariable Long storeId,
                                                   @PathVariable Long itemId,
                                                   @Valid @RequestBody InventoryStockCountRequest request) {
        return inventoryStockService.recordCount(memberId(jwt), storeId, itemId, request);
    }

    /**
     * 폐기 · 손실 등록. 버튼을 두 번 눌러도 한 번만 기록되게 하려면 화면이 요청마다 Idempotency-Key 헤더(UUID 등)를 보낸다.
     * 같은 키로 다시 보내면 새로 기록하지 않고 처음 기록을 돌려준다.
     */
    @PostMapping("/stock-adjustments")
    @ResponseStatus(HttpStatus.CREATED)
    public InventoryTransactionResponse recordAdjustment(@AuthenticationPrincipal Jwt jwt, @PathVariable Long storeId,
                                                         @PathVariable Long itemId,
                                                         @RequestHeader(name = "Idempotency-Key", required = false) String idempotencyKey,
                                                         @Valid @RequestBody InventoryStockAdjustmentRequest request) {
        return inventoryStockService.recordAdjustment(memberId(jwt), storeId, itemId, request, idempotencyKey);
    }

    /**
     * 추정 재고. ?at=2026-11-22T18:00:00%2B09:00 를 주면 그 시각 기준 (실사 · 폐기 저장 전 미리보기용), 없으면 지금.
     * URL 에서 + 는 공백으로 바뀌므로 %2B 로 보낸다.
     */
    @GetMapping("/stock")
    public InventoryStockResponse stock(@AuthenticationPrincipal Jwt jwt, @PathVariable Long storeId,
                                        @PathVariable Long itemId,
                                        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) OffsetDateTime at) {
        return inventoryStockService.getStock(memberId(jwt), storeId, itemId, at);
    }

    private Long memberId(Jwt jwt) {
        return Long.valueOf(jwt.getSubject());   // 토큰의 subject = 회원 번호
    }
}
