package com.nansogong.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import com.nansogong.model.ItemUnit;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

/**
 * 메뉴 1개의 원가 (UF-15 ④). at 시점의 레시피 × 그 시점 품목 단가로 계산한다.
 * 단가가 없는 품목이 하나라도 있으면 원가를 지어내지 않고 status = MISSING_COST, cost · costRate · grossProfit = null.
 */
public record MenuCostResponse(
        Long menuId,
        String menuName,
        BigDecimal price,          // 판매가
        BigDecimal cost,           // 원가 (계산 불가면 null)
        BigDecimal costRate,       // 원가율 % (소수 첫째 자리)
        BigDecimal grossProfit,    // 1개당 매출총이익 = 판매가 - 원가
        Status status,
        List<Line> lines,
        List<Long> missingCostItemIds,   // 단가를 넣어야 하는 품목 (보완 항목)
        Instant at                       // 계산 기준 시각
) {
    public enum Status {
        COMPLETE,       // 계산 완료
        MISSING_COST,   // 단가 없는 품목이 있음 → 단가 보완 필요
        NO_RECIPE       // 레시피가 없음 → 레시피 등록 필요
    }

    /** 품목 한 줄: 사용량 × 단가 = 금액 (단가가 없으면 unitCost · lineCost = null) */
    @Schema(name = "MenuCostLine")   // Swagger 이름 (Line 이 여러 개라 설명서에서 서로 덮어쓰지 않게)
    public record Line(Long itemId, String itemName, ItemUnit unit, BigDecimal quantity,
                       BigDecimal unitCost, BigDecimal lineCost) {}
}
