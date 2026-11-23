/**
 * 담당: 후상 · 유저 플로우: UF-09, UF-10, UF-11
 * <p>
 * 요구사항: 구현-3-1 품목, 3-2 초기 재고, 3-3 운영 기준·발주 수량 산정, 3-4 재고 현황, 3-5 판매 기반 추정 재고, 3-6 실사·폐기, 3-7 소비기한, 3-8 부족 알림
 * <p>
 * 개발 메모: 재고 계산은 코드/DB 에서. 주간 실사 알림은 @Scheduled + @SchedulerLock
 * <p>
 * 이 패키지 안에서 controller · service · repository · domain · dto 로 나눈다. 다른 담당 패키지의 표를 직접 수정하지 말고 그 패키지의 service 를 부른다.
 */
package com.nansogong.inventory;
