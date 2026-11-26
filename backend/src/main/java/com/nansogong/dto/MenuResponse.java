package com.nansogong.dto;

import com.nansogong.model.Menu;
import com.nansogong.model.MenuSaleStatus;
import com.nansogong.model.MenuSource;
import com.nansogong.model.MenuType;

import java.math.BigDecimal;
import java.util.List;

/**
 * 메뉴 응답. 기본 메뉴는 options 에 옵션 목록, 옵션이면 parentMenuId 가 있고 options 는 비어 있다.
 * 원가(cost) · 레시피는 레시피(11/27) · 원가(11/30) 기능에서 추가한다.
 */
public record MenuResponse(
        Long id,
        String name,
        String category,
        BigDecimal price,
        String spec,
        MenuSaleStatus saleStatus,
        MenuType menuType,
        MenuSource source,
        Long parentMenuId,
        boolean posConnected,          // POS 메뉴와 연결돼 있는지 (화면의 'POS 연결됨' 표시)
        List<MenuOptionResponse> options
) {
    public static MenuResponse from(Menu menu, boolean posConnected, List<MenuOptionResponse> options) {
        return new MenuResponse(menu.getId(), menu.getName(), menu.getCategory(), menu.getPrice(), menu.getSpec(),
                menu.getSaleStatus(), menu.getMenuType(), menu.getSource(), menu.getParentMenuId(), posConnected, options);
    }
}
