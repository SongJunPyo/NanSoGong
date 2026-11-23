/**
 * 담당: 소정 · 유저 플로우: UF-03, UF-04
 * <p>
 * 요구사항: 구현-1-7 POS·외부 서비스 연결, 1-8 마이데이터, 1-9 POS 판매 수집, 1-10 재고·거래처 수집, 1-11 표준화·통합, 1-12 동기화 상태, 1-14 POS 메뉴 연결
 * <p>
 * 개발 메모: posRestClient · supplierRestClient · mydataRestClient 사용. 연동 인증 정보는 app.crypto.credential-key 로 암호화 저장. 원본 payload 는 JSONB(@JdbcTypeCode(SqlTypes.JSON)). 메뉴명 유사도는 pg_trgm
 * <p>
 * 이 패키지 안에서 controller · service · repository · domain · dto 로 나눈다. 다른 담당 패키지의 표를 직접 수정하지 말고 그 패키지의 service 를 부른다.
 */
package com.nansogong.integration;
