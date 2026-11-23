/**
 * 업무 규칙 · 계산 · @Transactional. 맨 앞에서 StoreService.checkOwner(memberId, storeId) 로 내 매장인지 확인한다. 다른 도메인의 repository · Entity 는 직접 쓰지 않고 그 도메인의 service 메서드를 부른다.
 * <p>
 * 클래스 이름 앞에 도메인 이름을 붙인다 (예: InventoryService, StoreService). 도메인 · 담당 · 요구사항은 docs/notice/2026-11-23-개발-시작-안내.md 7-2장과 README "담당" 을 따른다.
 */
package com.nansogong.service;
