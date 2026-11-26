package com.nansogong.dto;

import com.nansogong.model.MenuSaleStatus;
import jakarta.validation.constraints.NotNull;

/** 판매 상태 변경 요청: ON_SALE / SOLD_OUT / INACTIVE */
public record MenuSaleStatusRequest(
        @NotNull MenuSaleStatus saleStatus
) {}
