/**
 * 담당: 백엔드 예원 · 프론트엔드 소정 · AI 후상(2-3 운영 제안 생성은 agent)
 * <p>
 * 유저 플로우: UF-05, UF-06
 * <p>
 * 요구사항: 구현-2-1 당장 할 일, 2-2 오늘 매출 요약, 2-3 운영 제안 3줄·전체보기, 2-4 운영 일정 캘린더, 2-5 주변 일정 관리
 * <p>
 * 개발 메모: 공휴일은 holidayRestClient. 운영 제안 생성 자체는 agent 패키지
 * <p>
 * 이 패키지 안에서 controller · service · repository · domain · dto 로 나눈다. 다른 도메인 패키지의 표를 직접 수정하지 말고 그 패키지의 service 를 부른다. AI 호출(프롬프트 · ChatClient · @Tool)은 AI 담당이 만들고, 이 패키지는 그 결과를 검증 · 저장한다.
 */
package com.nansogong.home;
