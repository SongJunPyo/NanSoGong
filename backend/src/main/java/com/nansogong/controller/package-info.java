/**
 * URL 을 받아 service 를 부르는 @RestController. 로직 없이 service 호출 · DTO 변환만 한다. 토큰 주인은 @AuthenticationPrincipal Jwt jwt → jwt.getSubject().
 * <p>
 * 클래스 이름 앞에 도메인 이름을 붙인다 (예: InventoryController, StoreController). 도메인 · 담당 · 요구사항은 docs/notice/2026-11-23-개발-시작-안내.md 7-2장과 README "담당" 을 따른다.
 */
package com.nansogong.controller;
