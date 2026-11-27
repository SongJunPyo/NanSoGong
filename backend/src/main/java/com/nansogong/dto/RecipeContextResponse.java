package com.nansogong.dto;

import com.nansogong.model.ItemCostSource;
import com.nansogong.model.ItemUnit;
import com.nansogong.model.RecipeAppliesTo;
import io.swagger.v3.oas.annotations.media.Schema;

import java.math.BigDecimal;
import java.util.List;

/**
 * 레시피 초안 맥락 (#35 ①): AI 가 초안을 만들 때 쓰는 매장 재료와 지금 메뉴 레시피.
 * AI 는 DB 를 직접 보지 않으므로 이 응답에 든 것만 안다.
 *
 * @param items 사용 중인 품목만. 단가가 확인되지 않은 품목은 unitCost · costSource 가 null (AI 가 채우지 않는다)
 * @param menus 기본 메뉴(옵션 제외, 판매 중지 제외)와 지금 레시피
 */
public record RecipeContextResponse(
        List<Item> items,
        List<Menu> menus
) {
    @Schema(name = "RecipeContextItem")
    public record Item(Long itemId, String name, ItemUnit unit, BigDecimal unitCost, ItemCostSource costSource) {}

    @Schema(name = "RecipeContextMenu")
    public record Menu(Long menuId, String name, String category, BigDecimal price, List<Line> recipe) {}

    @Schema(name = "RecipeContextLine")
    public record Line(Long itemId, String itemName, ItemUnit unit, BigDecimal quantity, RecipeAppliesTo appliesTo) {}
}
