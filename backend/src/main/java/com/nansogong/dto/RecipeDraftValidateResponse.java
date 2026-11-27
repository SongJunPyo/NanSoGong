package com.nansogong.dto;

import com.nansogong.model.ItemUnit;
import io.swagger.v3.oas.annotations.media.Schema;

import java.math.BigDecimal;
import java.util.List;

/**
 * 레시피 초안 검증 결과 (#35 ②). 요청 줄과 같은 순서로 결과를 돌려준다.
 *
 * @param valid        모든 줄이 ok 면 true. 단가가 없는 것은 valid 를 막지 않는다 (missingCosts 로 안내)
 * @param lines        줄별 결과
 * @param reasons      줄 하나가 아니라 초안 전체의 문제 (지금은 정한 규칙이 없어 항상 빈 목록. AI 쪽 계약 모양에 맞춰 둔 칸)
 * @param totalCost    모든 줄이 ok 이고 단가가 다 있을 때만 원가 합계 (소수 2자리). 아니면 null
 * @param missingCosts 품목은 맞는데 단가가 확인되지 않은 품목 번호 (AI 가 단가를 만들어 넣지 않는다)
 */
public record RecipeDraftValidateResponse(
        boolean valid,
        List<Line> lines,
        List<String> reasons,
        BigDecimal totalCost,
        List<Long> missingCosts
) {
    /**
     * @param ok            이 줄을 그대로 쓸 수 있으면 true
     * @param reason        ok 가 false 일 때 이유 코드 (AI 가 고칠 때 쓴다)
     * @param itemId        찾은 매장 품목 번호
     * @param normalizedQty 품목 관리 단위로 바꾼 사용량 (예: 0.2 L → 200 ML), 소수 3자리까지
     * @param unit          품목 관리 단위
     * @param unitCost      관리 단위 1당 현재 단가. 확인되지 않았으면 null
     */
    @Schema(name = "RecipeDraftResultLine")
    public record Line(boolean ok, Reason reason, Long itemId, BigDecimal normalizedQty, ItemUnit unit, BigDecimal unitCost) {}

    /** ok 가 false 인 이유 */
    public enum Reason {
        ITEM_NOT_FOUND,   // 매장에 그런 품목이 없음 (번호가 없거나 다른 매장 것, 또는 같은 이름의 사용 중 품목 없음)
        ITEM_AMBIGUOUS,   // 같은 이름의 사용 중 품목이 여러 개
        ITEM_INACTIVE,    // 사용 중지된 품목
        DUPLICATE_ITEM,   // 같은 품목이 초안에 두 번 나옴 (레시피 저장 규칙과 같음)
        UNKNOWN_UNIT,     // G · KG · ML · L · EA 가 아닌 단위
        UNIT_MISMATCH,    // 품목 관리 단위로 바꿀 수 없음 (예: 우유(ML)에 G)
        INVALID_QTY       // 사용량이 0 이하
    }
}
