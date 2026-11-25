package com.nansogong.controller;

import com.nansogong.dto.InventoryItemResponse;
import com.nansogong.service.InventoryItemService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/** 품목. 담당: 준표. 목록 조회만 먼저 만들었다 (레시피 화면용, 준표 동의) */
@RestController
@RequestMapping("/api/stores/{storeId}/inventory-items")
@RequiredArgsConstructor
public class InventoryItemController {

    private final InventoryItemService inventoryItemService;

    @GetMapping
    public List<InventoryItemResponse> items(@AuthenticationPrincipal Jwt jwt, @PathVariable Long storeId) {
        return inventoryItemService.getItems(Long.valueOf(jwt.getSubject()), storeId);
    }
}
