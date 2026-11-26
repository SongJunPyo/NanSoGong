package com.nansogong.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import com.nansogong.model.RecipeAppliesTo;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.util.List;

/**
 * 레시피 저장 요청: 메뉴 1개(또는 옵션 1개)에 들어가는 품목 전체를 한 번에 보낸다.
 * 저장하면 지금 레시피는 닫히고(valid_to = 지금) 이 내용이 새 레시피가 된다. 빈 목록이면 '재고를 쓰지 않는 메뉴'.
 */
public record RecipeSaveRequest(
        @NotNull @Valid List<Line> items
) {
    /**
     * @param quantity  메뉴 1개당 관리 단위 사용량. 기본 메뉴는 양수, 옵션은 기본 대비 증감량(음수 가능, 0 은 안 됨)
     * @param appliesTo 없으면 ALL
     */
    @Schema(name = "RecipeSaveLine")   // Swagger 이름 (Line 이 여러 개라 설명서에서 서로 덮어쓰지 않게)
    public record Line(
            @NotNull Long itemId,
            @NotNull @Digits(integer = 16, fraction = 3) BigDecimal quantity,   // DB DECIMAL(19,3): 소수 4자리부터 400
            RecipeAppliesTo appliesTo
    ) {}
}
