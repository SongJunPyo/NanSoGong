package com.nansogong.controller;

import com.nansogong.dto.RecipeResponse;
import com.nansogong.dto.RecipeSaveRequest;
import com.nansogong.service.RecipeService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** 메뉴 · 옵션의 레시피. 메뉴 도메인이라 /menus 아래에 둔다 */
@RestController
@RequestMapping("/api/stores/{storeId}/menus/{menuId}/recipe")
@RequiredArgsConstructor
public class RecipeController {

    private final RecipeService recipeService;

    @GetMapping
    public RecipeResponse recipe(@AuthenticationPrincipal Jwt jwt, @PathVariable Long storeId, @PathVariable Long menuId) {
        return recipeService.getRecipe(Long.valueOf(jwt.getSubject()), storeId, menuId);
    }

    /** 통째로 교체. 기존 레시피는 지우지 않고 닫는다 */
    @PutMapping
    public RecipeResponse save(@AuthenticationPrincipal Jwt jwt, @PathVariable Long storeId, @PathVariable Long menuId,
                               @Valid @RequestBody RecipeSaveRequest request) {
        return recipeService.saveRecipe(Long.valueOf(jwt.getSubject()), storeId, menuId, request);
    }
}
