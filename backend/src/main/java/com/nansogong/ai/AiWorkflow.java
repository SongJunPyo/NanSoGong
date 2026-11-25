package com.nansogong.ai;

/**
 * AI 를 부르는 업무 목록. 업무마다 쓸 모델 등급과 응답 길이 상한을 정한다.
 * <p>
 * 모델 이름은 application.yml 의 app.ai.models (general · browser-agent) 에서 읽는다.
 * 새 AI 업무를 추가하면 여기에 한 줄 추가한다 (로그 · 추적에서 업무 이름으로 쓴다).
 */
public enum AiWorkflow {

    PING(ModelTier.GENERAL, 64),
    RECIPE_DRAFT(ModelTier.GENERAL, 4096),
    MENU_RECOMMEND(ModelTier.GENERAL, 8192),
    OPERATION_SUMMARY(ModelTier.GENERAL, 2048),
    COUPON_PLAN(ModelTier.GENERAL, 4096),
    PURCHASE_PLAN(ModelTier.GENERAL, 4096),
    PURCHASE_BROWSER_AGENT(ModelTier.BROWSER_AGENT, 8192);

    public enum ModelTier { GENERAL, BROWSER_AGENT }

    private final ModelTier tier;
    private final int maxTokens;

    AiWorkflow(ModelTier tier, int maxTokens) {
        this.tier = tier;
        this.maxTokens = maxTokens;
    }

    public ModelTier tier() {
        return tier;
    }

    public int maxTokens() {
        return maxTokens;
    }
}
