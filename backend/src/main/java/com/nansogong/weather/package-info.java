/**
 * 담당: 백엔드 예원 · 프론트엔드 소정 · AI 후상(수요 예측 입력으로 사용)
 * <p>
 * 유저 플로우: UF-02, UF-05
 * <p>
 * 요구사항: 구현-1-13 날씨 정보 수집
 * <p>
 * 개발 메모: kmaRestClient 사용. 격자 단위 Redis 캐시, @Scheduled + @SchedulerLock 으로 주기 수집. 목업에서 nx=0 이면 503(장애 테스트)
 * <p>
 * 이 패키지 안에서 controller · service · repository · domain · dto 로 나눈다. 다른 도메인 패키지의 표를 직접 수정하지 말고 그 패키지의 service 를 부른다. AI 호출(프롬프트 · ChatClient · @Tool)은 AI 담당이 만들고, 이 패키지는 그 결과를 검증 · 저장한다.
 */
package com.nansogong.weather;
