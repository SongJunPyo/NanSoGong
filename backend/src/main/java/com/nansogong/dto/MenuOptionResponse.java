package com.nansogong.dto;

import com.nansogong.model.Menu;
import com.nansogong.model.MenuSaleStatus;

import java.math.BigDecimal;

/** 메뉴에 붙은 옵션 */
public record MenuOptionResponse(
        Long id,
        String name,
        BigDecimal price,
        MenuSaleStatus saleStatus,
        boolean posConnected
) {
    public static MenuOptionResponse from(Menu option, boolean posConnected) {
        return new MenuOptionResponse(option.getId(), option.getName(), option.getPrice(), option.getSaleStatus(), posConnected);
    }
}
