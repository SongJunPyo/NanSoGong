package com.nansogong.dto;

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
