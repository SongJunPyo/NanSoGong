package com.nansogong.controller;

import com.nansogong.dto.StoreResponse;
import com.nansogong.dto.StoreUpdateRequest;
import com.nansogong.service.StoreService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/stores")
@RequiredArgsConstructor
public class StoreController {
    private final StoreService storeService;

    @GetMapping
    public Page<StoreResponse> list(@AuthenticationPrincipal Jwt jwt, @PageableDefault(sort = "id") Pageable pageable) {
        return storeService.listMine(Long.valueOf(jwt.getSubject()), pageable);
    }

    @GetMapping("/{storeId}")
    public StoreResponse get(@AuthenticationPrincipal Jwt jwt, @PathVariable Long storeId) {
        return storeService.getMine(Long.valueOf(jwt.getSubject()), storeId);
    }

    @PutMapping("/{storeId}")
    public StoreResponse update(@AuthenticationPrincipal Jwt jwt, @PathVariable Long storeId, @Valid @RequestBody StoreUpdateRequest request) {
        return storeService.updateBasics(Long.valueOf(jwt.getSubject()), storeId, request);
    }
}
