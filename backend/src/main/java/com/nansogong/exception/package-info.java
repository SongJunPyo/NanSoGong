/**
 * 업무 예외. BusinessException(HttpStatus, code, message) 를 상속하고, 에러 코드는 UPPER_SNAKE_CASE 로 쓴다.
 * <p>
 * 클래스 이름 앞에 도메인 이름을 붙인다 (예: InventoryItemNotFoundException). 도메인 · 담당 · 요구사항은 docs/notice/2026-11-23-개발-시작-안내.md 7-2장과 README "담당" 을 따른다.
 */
package com.nansogong.exception;
