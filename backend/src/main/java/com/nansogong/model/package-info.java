/**
 * @Entity. @Data 대신 @Getter, 값 변경은 setter 대신 업무 메서드(approve(), cancel()). 표는 Flyway SQL(db/migration)로만 만든다.
 * <p>
 * 클래스 이름 앞에 도메인 이름을 붙인다 (예: InventoryItem, PurchaseOrder). 도메인 · 담당 · 요구사항은 docs/notice/2026-11-23-개발-시작-안내.md 7-2장과 README "담당" 을 따른다.
 */
package com.nansogong.model;
