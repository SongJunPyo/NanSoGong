package com.nansogong.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

/** 옵션 등록 요청. 옵션은 0원도 된다 (예: 얼음 적게) */
public record MenuOptionRequest(
        @NotBlank @Size(max = 100) String name,
        @NotNull @PositiveOrZero BigDecimal price
) {}
