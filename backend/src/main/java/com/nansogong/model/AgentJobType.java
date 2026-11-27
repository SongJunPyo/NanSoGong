package com.nansogong.model;

/** AI 작업 종류 (ai_job.job_type) */
public enum AgentJobType {
    RECIPE_DRAFT,          // 레시피 초안
    NEW_MENU_SUGGEST,      // 신메뉴 추천
    PURCHASE_SUGGEST,      // 발주 제안
    PURCHASE_EXECUTE,      // 승인 후 발주 실행
    COUPON_SUGGEST,        // 쿠폰 제안
    OPERATIONS_ANALYSIS;   // 운영 분석

    /** 이 작업이 저장하는 제안 유형. 제안을 만들지 않는 작업이면 null */
    public SuggestionType suggestionType() {
        return switch (this) {
            case RECIPE_DRAFT, NEW_MENU_SUGGEST -> SuggestionType.MENU;
            case PURCHASE_SUGGEST -> SuggestionType.PURCHASE;
            case COUPON_SUGGEST -> SuggestionType.COUPON;
            case PURCHASE_EXECUTE, OPERATIONS_ANALYSIS -> null;
        };
    }
}
