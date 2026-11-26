package com.nansogong.controller;

import com.nansogong.dto.InventoryItemCreateRequest;
import com.nansogong.dto.InventoryItemResponse;
import com.nansogong.dto.InventoryItemUpdateRequest;
import com.nansogong.service.InventoryItemService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
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
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/** 재고 품목 (구현-3-1, UF-09). 삭제 대신 사용 중지만 있다 */
@RestController
@RequestMapping("/api/stores/{storeId}/inventory-items")
@RequiredArgsConstructor
public class InventoryItemController {

    private final InventoryItemService inventoryItemService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public InventoryItemResponse create(@AuthenticationPrincipal Jwt jwt, @PathVariable Long storeId,
                                        @Valid @RequestBody InventoryItemCreateRequest request) {
        return inventoryItemService.create(memberId(jwt), storeId, request);
    }

    /** 목록. ?name=원두 (부분 검색), ?active=true (사용 중만) · false (중지만) · 생략 (전체) */
    @GetMapping
    public Page<InventoryItemResponse> items(@AuthenticationPrincipal Jwt jwt, @PathVariable Long storeId,
                                             @RequestParam(required = false) String name,
                                             @RequestParam(required = false) Boolean active,
                                             @PageableDefault(size = 20, sort = "name") Pageable pageable) {
        return inventoryItemService.getItems(memberId(jwt), storeId, name, active, pageable);
    }

    @GetMapping("/{itemId}")
    public InventoryItemResponse item(@AuthenticationPrincipal Jwt jwt, @PathVariable Long storeId,
                                      @PathVariable Long itemId) {
        return inventoryItemService.getItem(memberId(jwt), storeId, itemId);
    }

    /** 수정 (관리 단위는 바꿀 수 없다) */
    @PutMapping("/{itemId}")
    public InventoryItemResponse update(@AuthenticationPrincipal Jwt jwt, @PathVariable Long storeId,
                                        @PathVariable Long itemId,
                                        @Valid @RequestBody InventoryItemUpdateRequest request) {
        return inventoryItemService.update(memberId(jwt), storeId, itemId, request);
    }

    /** 사용 중지 */
    @PatchMapping("/{itemId}/deactivate")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deactivate(@AuthenticationPrincipal Jwt jwt, @PathVariable Long storeId, @PathVariable Long itemId) {
        inventoryItemService.deactivate(memberId(jwt), storeId, itemId);
    }

    private Long memberId(Jwt jwt) {
        return Long.valueOf(jwt.getSubject());   // 토큰의 subject = 회원 번호
    }
}
