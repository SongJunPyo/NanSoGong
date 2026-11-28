package com.nansogong.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.util.List;

/**
 * 레시피 초안 검증 요청 (#35 ②): AI 가 만든 초안.
 *
 * @param menuName 초안을 만든 메뉴 이름 (기록 · 안내용)
 * @param lines    재료 줄. itemId 가 없으면 itemName 으로 매장 품목을 찾고, 없으면 새 재료(NEW_ITEM)로 본다
 */
public record RecipeDraftValidateRequest(
        @NotBlank @Size(max = 100) String menuName,
        @NotEmpty @Valid List<Line> lines
) {
    /**
     * @param itemId   알고 있으면 품목 번호 (있으면 이름보다 우선)
     * @param itemName 재료 이름
     * @param quantity 메뉴 1개당 사용량 (Java 레시피 저장의 quantity 와 같은 이름. Python 은 "200" 처럼 문자열로 보낸다)
     * @param unit     qty 의 단위: G · KG · ML · L · EA (대소문자 무시)
     */
    @Schema(name = "RecipeDraftLine")
    public record Line(
            Long itemId,
            @NotBlank @Size(max = 100) String itemName,
            @NotNull BigDecimal quantity,
            @NotBlank @Size(max = 10) String unit
    ) {}
}
