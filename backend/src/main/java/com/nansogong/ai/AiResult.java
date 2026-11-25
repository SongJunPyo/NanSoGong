package com.nansogong.ai;

/**
 * AI 호출 결과. AI 가 실패해도 예외 대신 대체 결과(fallback)를 담아 돌려준다.
 *
 * @param value         검증을 통과한 AI 결과 또는 대체 결과
 * @param aiGenerated   true = AI 가 만든 결과 / false = AI 실패로 대체 결과를 썼다 (화면에서 구분 표시)
 * @param failureReason 대체 결과를 쓴 이유 (사용자에게 그대로 보여 주지 않는 내부 코드 · 요약). AI 결과면 null
 */
public record AiResult<T>(T value, boolean aiGenerated, String failureReason) {

    public static <T> AiResult<T> ofAi(T value) {
        return new AiResult<>(value, true, null);
    }

    public static <T> AiResult<T> ofFallback(T value, String failureReason) {
        return new AiResult<>(value, false, failureReason);
    }
}
