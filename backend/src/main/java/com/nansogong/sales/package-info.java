/**
 * 담당: 백엔드 예원 · 프론트엔드 소정
 * <p>
 * 유저 플로우: UF-17, UF-18
 * <p>
 * 요구사항: 구현-5-1 기간별 매출, 5-2 재무 캘린더, 5-3 비용 등록, 5-4 원가율·비용 구성, 5-5 예상 이익
 * <p>
 * 개발 메모: date_trunc · generate_series 집계, 일별 요약은 머티리얼라이즈드 뷰. 매출(판매일)과 입출금(거래일)은 합산하지 않는다
 * <p>
 * 이 패키지 안에서 controller · service · repository · domain · dto 로 나눈다. 다른 도메인 패키지의 표를 직접 수정하지 말고 그 패키지의 service 를 부른다.
 */
package com.nansogong.sales;
