package com.nansogong.dto;

/**
 * usageOf 에 넘기는 옵션 하나: resolve 로 찾은 옵션 메뉴 번호 + 메뉴 1개당 수량 (AGENTS.md 3-5).
 * menuId 가 null 이면 (제외된 옵션) 사용량 0 으로 본다.
 */
public record OptionQty(Long menuId, int qty) {}
