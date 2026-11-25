package com.nansogong.dto;

/**
 * AI 연결 확인 결과.
 *
 * @param status  OK · NO_KEY · ERROR
 * @param model   사용한 모델 ID
 * @param reply   Claude 의 짧은 답 (OK 일 때만)
 * @param message 사람이 읽을 안내 문구
 */
public record AiPingResponse(String status, String model, String reply, String message) {
}
