package com.nansogong.model;

import java.math.BigDecimal;

/**
 * 재고 현황의 품목별 상태 (구현-3-4). 한글 표시는 프론트가 바꾼다.
 * 위에서부터 먼저 맞는 것을 고른다 (docs/rules/domain.md 재고 계산).
 */
public enum InventoryStockStatus {
    NOT_INITIALIZED,   // 초기 재고 미입력: 수량을 모른다
    CHECK_NEEDED,      // 추정 재고가 음수: 레시피 과다 · 입고 누락 등 기록 확인 필요 → 실사 권장
    SHORTAGE,          // 부족: 0 이거나 발주 검토 기준(reorder_point) 이하
    NO_THRESHOLD,      // 수량은 있지만 발주 검토 기준이 아직 없어 부족 여부를 판단할 수 없음
    ENOUGH;            // 기준보다 많음

    /**
     * @param estimatedQty 추정 재고 (초기 재고가 없으면 null)
     * @param reorderPoint 발주 검토 기준 (미산정이면 null)
     */
    public static InventoryStockStatus of(BigDecimal estimatedQty, BigDecimal reorderPoint) {
        if (estimatedQty == null) {
            return NOT_INITIALIZED;
        }
        if (estimatedQty.signum() < 0) {
            return CHECK_NEEDED;
        }
        if (estimatedQty.signum() == 0) {
            return SHORTAGE;
        }
        if (reorderPoint == null) {
            return NO_THRESHOLD;
        }
        return estimatedQty.compareTo(reorderPoint) <= 0 ? SHORTAGE : ENOUGH;
    }
}
