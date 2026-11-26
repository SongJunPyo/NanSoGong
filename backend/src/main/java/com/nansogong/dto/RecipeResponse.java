package com.nansogong.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import com.nansogong.model.ItemUnit;
import com.nansogong.model.RecipeAppliesTo;
import com.nansogong.model.RecipeSource;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

/** 메뉴의 지금 레시피 */
public record RecipeResponse(
        Long menuId,
        List<Line> items
) {
    @Schema(name = "RecipeLine")   // Swagger 이름 (Line 이 여러 개라 설명서에서 서로 덮어쓰지 않게)
    public record Line(
            Long recipeItemId,
            Long itemId,
            String itemName,
            ItemUnit unit,
            BigDecimal quantity,
            RecipeAppliesTo appliesTo,
            RecipeSource source,
            Instant validFrom
    ) {}
}
