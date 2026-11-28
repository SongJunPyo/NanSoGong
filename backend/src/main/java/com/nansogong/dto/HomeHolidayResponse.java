package com.nansogong.dto;

import org.springframework.data.domain.Page;

import java.time.Instant;
import java.time.LocalDate;

/** 공휴일 원천은 전국 공통이다. 매장 휴무일·영업일 여부는 별도로 판단한다. */
public record HomeHolidayResponse(
        Long storeId,
        String source,
        boolean mock,
        int year,
        int month,
        Instant fetchedAt,
        Page<Holiday> holidays
) {
    public record Holiday(LocalDate date, String name) {}
}
