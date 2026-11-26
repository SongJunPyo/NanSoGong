package com.nansogong.dto;

import com.nansogong.model.PosMappingStatus;

import java.util.List;

/**
 * MenuService.resolve 결과: POS 코드 → 앱 메뉴 번호.
 * - menuId / 옵션 menuId 는 못 찾으면 null
 * - status: MAPPED(연결됨) · EXCLUDED(제외: 재고를 안 쓰는 메뉴·옵션, 사용량 0 으로 정상 처리) · UNMAPPED(못 찾음)
 */
public record ResolvedMenu(
        String posMenuCode,
        Long menuId,
        PosMappingStatus status,
        List<ResolvedOption> options
) {
    public record ResolvedOption(String posOptionCode, Long menuId, PosMappingStatus status) {}

    /** 메뉴와 모든 옵션이 MAPPED 또는 EXCLUDED 면 true. false 면 재고 차감 대신 NEEDS_FIX */
    public boolean complete() {
        return status != PosMappingStatus.UNMAPPED
                && options.stream().noneMatch(o -> o.status() == PosMappingStatus.UNMAPPED);
    }
}
