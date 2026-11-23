/**
 * 담당: 백엔드 예원 · 프론트엔드 소정 · AI 후상(2-6 추천 문구 · 근거 생성)
 * <p>
 * 유저 플로우: UF-07, UF-08
 * <p>
 * 요구사항: 구현-2-6 쿠폰 추천안 생성, 2-7 추천안 조회·수정, 2-8 발행 결정, 5-6 쿠폰 사용 현황(매출 탭 안에 표시)
 * <p>
 * 개발 메모: 할인·예산·손익 계산은 코드, LLM 은 문구·근거만. 기간 충돌은 btree_gist EXCLUDE 제약. POS 등록 목업: X-Mock-Scenario unsupported/timeout
 * <p>
 * 이 패키지 안에서 controller · service · repository · domain · dto 로 나눈다. 다른 도메인 패키지의 표를 직접 수정하지 말고 그 패키지의 service 를 부른다. AI 호출(프롬프트 · ChatClient · @Tool)은 AI 담당이 만들고, 이 패키지는 그 결과를 검증 · 저장한다.
 */
package com.nansogong.coupon;
