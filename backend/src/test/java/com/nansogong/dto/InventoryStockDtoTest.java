package com.nansogong.dto;

import com.nansogong.model.InventoryStockCount;
import com.nansogong.model.InventoryStockCountType;
import com.nansogong.model.ItemUnit;
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

/** 초기 재고 입력 검증과 추정 재고 계산 결과 (DB 없이). 수량은 경계값(0, 음수, 소수 자릿수)을 넣어 본다 */
class InventoryStockDtoTest {

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

    private Set<String> invalidFields(String qty, OffsetDateTime countedAt) {
        var request = new InventoryStockCountRequest(qty == null ? null : new BigDecimal(qty), countedAt, null);
        return validator.validate(request).stream()
                .map(ConstraintViolation::getPropertyPath)
                .map(Object::toString)
                .collect(Collectors.toSet());
    }

    @Test
    void 초기재고는_0이상_소수셋째자리까지() {
        OffsetDateTime at = OffsetDateTime.parse("2026-11-20T09:00:00+09:00");
        assertThat(invalidFields("0", at)).isEmpty();
        assertThat(invalidFields("18.125", at)).isEmpty();
        assertThat(invalidFields("-0.001", at)).containsExactly("countedQty");
        assertThat(invalidFields("18.1255", at)).containsExactly("countedQty");
    }

    @Test
    void 수량과_기준일시는_필수() {
        assertThat(invalidFields(null, null)).containsExactlyInAnyOrder("countedQty", "countedAt");
    }

    @Test
    void 추정재고는_기준수량에_기준이후_변동을_더한다() {
        Instant baseAt = Instant.parse("2026-11-20T00:00:00Z");
        var base = InventoryStockCount.initial(1L, 10L, new BigDecimal("10000.000"), baseAt, null);

        var stock = InventoryStockResponse.of(10L, ItemUnit.ML, base, new BigDecimal("2499.500"), Instant.now());

        assertThat(stock.initialized()).isTrue();
        assertThat(stock.estimatedQty()).isEqualByComparingTo("12499.5");
        assertThat(stock.baseQty()).isEqualByComparingTo("10000");
        assertThat(stock.baseType()).isEqualTo(InventoryStockCountType.INITIAL);
        assertThat(stock.baseAt()).isEqualTo(baseAt);
    }

    @Test
    void 변동이_기준수량보다_크게_빠지면_음수도_그대로_보여준다() {
        // 레시피 과다 · 입고 누락 신호: 0 으로 자르지 않고 실사로 바로잡게 한다
        var base = InventoryStockCount.initial(1L, 10L, new BigDecimal("100"), Instant.parse("2026-11-20T00:00:00Z"), null);
        var stock = InventoryStockResponse.of(10L, ItemUnit.G, base, new BigDecimal("-150.5"), Instant.now());
        assertThat(stock.estimatedQty()).isEqualByComparingTo("-50.5");
    }

    @Test
    void 기준점이_없으면_수량을_0이_아니라_null로_준다() {
        var stock = InventoryStockResponse.notInitialized(10L, ItemUnit.EA, Instant.now());
        assertThat(stock.initialized()).isFalse();
        assertThat(stock.estimatedQty()).isNull();
        assertThat(stock.baseQty()).isNull();
        assertThat(stock.changeSinceBase()).isNull();
    }
}
