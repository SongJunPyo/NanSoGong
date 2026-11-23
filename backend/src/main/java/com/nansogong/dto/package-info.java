/**
 * 요청 · 응답 record. 응답은 static from(Entity) 로 만들고 Entity 를 그대로 응답하지 않는다. 요청에는 @NotNull · @Positive 등 검증을 붙인다.
 * <p>
 * 클래스 이름 앞에 도메인 이름을 붙인다 (예: InventoryItemCreateRequest, InventoryItemResponse). 도메인 · 담당 · 요구사항은 docs/notice/2026-11-23-개발-시작-안내.md 7-2장과 README "담당" 을 따른다.
 */
package com.nansogong.dto;
