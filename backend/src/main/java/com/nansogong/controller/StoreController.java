package com.nansogong.controller;

import com.nansogong.dto.StoreResponse;
import com.nansogong.service.StoreService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/** 매장. 토큰이 있어야 들어올 수 있다 */
@RestController
@RequestMapping("/api/stores")
@RequiredArgsConstructor
public class StoreController {

    private final StoreService storeService;

    @GetMapping
    public List<StoreResponse> myStores(@AuthenticationPrincipal Jwt jwt) {
        return storeService.getMyStores(Long.valueOf(jwt.getSubject()));
    }

    @GetMapping("/{storeId}")
    public StoreResponse store(@AuthenticationPrincipal Jwt jwt, @PathVariable Long storeId) {
        return storeService.getStore(Long.valueOf(jwt.getSubject()), storeId);
    }
}
