package com.nansogong.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

/** 메뉴 등록 · 수정 요청 */
public record MenuRequest(
        @NotBlank @Size(max = 100) String name,
        @Size(max = 50) String category,
        @NotNull @Positive BigDecimal price,     // 판매가 > 0
        @Size(max = 50) String spec              // 규격. 예: 톨, 1인분
) {}
