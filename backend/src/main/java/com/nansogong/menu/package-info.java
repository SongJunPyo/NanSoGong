/**
 * 담당: 경모 · 유저 플로우: UF-15, UF-16
 * <p>
 * 요구사항: 구현-4-1 메뉴 등록·수정, 4-2 레시피 AI 추천·수정, 4-3 원가·원가율, 4-4 인기·부진 분석, 4-5 AI 신메뉴·세트 추천
 * <p>
 * 개발 메모: 트렌드는 naverDatalabRestClient. 추천·레시피 초안은 Spring AI ChatClient, 예상 마진은 코드로 계산
 * <p>
 * 이 패키지 안에서 controller · service · repository · domain · dto 로 나눈다. 다른 담당 패키지의 표를 직접 수정하지 말고 그 패키지의 service 를 부른다.
 */
package com.nansogong.menu;
