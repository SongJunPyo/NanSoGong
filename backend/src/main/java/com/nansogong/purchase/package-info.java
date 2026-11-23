/**
 * 담당: 후상 · 유저 플로우: UF-12, UF-13, UF-14
 * <p>
 * 요구사항: 구현-3-9 신규 판매처 탐색, 3-10 발주 추천 검토·수정, 3-11 발주 승인·전송, 3-12 주문·배송 상태, 3-13 입고 확인, 3-14 정정 요청
 * <p>
 * 개발 메모: supplierRestClient 사용. 전송에는 Idempotency-Key 필수. 목업: X-Mock-Scenario out-of-stock/partial/timeout
 * <p>
 * 이 패키지 안에서 controller · service · repository · domain · dto 로 나눈다. 다른 담당 패키지의 표를 직접 수정하지 말고 그 패키지의 service 를 부른다.
 */
package com.nansogong.purchase;
