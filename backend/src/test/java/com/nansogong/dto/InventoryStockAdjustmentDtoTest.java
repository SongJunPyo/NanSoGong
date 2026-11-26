package com.nansogong.dto;

import com.nansogong.model.InventoryAdjustmentType;
import com.nansogong.model.InventoryStockCount;
import com.nansogong.model.InventoryTransactionType;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.Set;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;

/** 폐기 · 손실 입력 검증과 실사 차이 계산 (DB 없이) */
class InventoryStockAdjustmentDtoTest {

    private static ValidatorFactory factory;
    private static Validator validator;

    @BeforeAll
    static void setUp() {
        factory = Validation.buildDefaultValidatorFactory();
        validator = factory.getValidator();
    }

    @AfterAll
    static void tearDown() {
        factory.close();
    }

    private Set<String> invalidFields(InventoryAdjustmentType type, String qty) {
        var request = new InventoryStockAdjustmentRequest(type, qty == null ? null : new BigDecimal(qty),
                OffsetDateTime.parse("2026-11-20T09:00:00+09:00"), null);
        return validator.validate(request).stream()
                .map(ConstraintViolation::getPropertyPath)
                .map(Object::toString)
                .collect(Collectors.toSet());
    }

    @Test
    void 폐기손실_수량은_0보다_크고_소수셋째자리까지() {
        assertThat(invalidFields(InventoryAdjustmentType.DISPOSAL, "0.001")).isEmpty();
        assertThat(invalidFields(InventoryAdjustmentType.LOSS, "200.5")).isEmpty();
        assertThat(invalidFields(InventoryAdjustmentType.DISPOSAL, "0")).containsExactly("qty");
        assertThat(invalidFields(InventoryAdjustmentType.DISPOSAL, "-1")).containsExactly("qty");
        assertThat(invalidFields(InventoryAdjustmentType.DISPOSAL, "1.0005")).containsExactly("qty");
        assertThat(invalidFields(null, null)).containsExactlyInAnyOrder("type", "qty");
    }

    @Test
    void 폐기손실은_같은_이름의_장부_종류로_남는다() {
        assertThat(InventoryAdjustmentType.DISPOSAL.toTransactionType()).isEqualTo(InventoryTransactionType.DISPOSAL);
        assertThat(InventoryAdjustmentType.LOSS.toTransactionType()).isEqualTo(InventoryTransactionType.LOSS);
    }

    @Test
    void 실사_차이는_실제수량에서_추정재고를_뺀다() {
        Instant at = Instant.parse("2026-11-22T09:00:00Z");
        var less = InventoryStockCount.count(1L, 10L, new BigDecimal("8000.000"), new BigDecimal("7500.000"), at, null);
        var more = InventoryStockCount.count(1L, 10L, new BigDecimal("-1000.000"), new BigDecimal("4000.000"), at, null);
        var exact = InventoryStockCount.count(1L, 10L, new BigDecimal("12.500"), new BigDecimal("12.5"), at, null);

        assertThat(InventoryStockCountResponse.from(less).difference()).isEqualByComparingTo("-500");   // 기록보다 덜 있음
        assertThat(InventoryStockCountResponse.from(more).difference()).isEqualByComparingTo("5000");   // 입고 누락 등
        assertThat(InventoryStockCountResponse.from(exact).difference()).isEqualByComparingTo("0");
    }

    @Test
    void 초기재고는_비교할_추정재고가_없어_차이도_null() {
        var initial = InventoryStockCount.initial(1L, 10L, new BigDecimal("100"), Instant.parse("2026-11-20T00:00:00Z"), null);
        assertThat(InventoryStockCountResponse.from(initial).difference()).isNull();
    }
}
