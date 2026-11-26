package com.nansogong.dto;

import jakarta.validation.Validation;
import jakarta.validation.Validator;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/** DB 소수 자릿수보다 길게 오면 말없이 반올림하지 않고 검증에서 막는다 (컨트롤러 @Valid → 400) */
class DigitsValidationTest {

    private final Validator validator = Validation.buildDefaultValidatorFactory().getValidator();

    @Test
    void 레시피_수량은_소수_3자리까지() {
        assertThat(validator.validate(recipe("18.125"))).isEmpty();
        assertThat(validator.validate(recipe("18.1255"))).isNotEmpty();
    }

    @Test
    void 메뉴_가격은_소수_2자리까지() {
        assertThat(validator.validate(new MenuRequest("라떼", null, new BigDecimal("5000.50"), null))).isEmpty();
        assertThat(validator.validate(new MenuRequest("라떼", null, new BigDecimal("5000.505"), null))).isNotEmpty();
    }

    @Test
    void 옵션_가격은_소수_2자리까지() {
        assertThat(validator.validate(new MenuOptionRequest("샷 추가", new BigDecimal("500.00")))).isEmpty();
        assertThat(validator.validate(new MenuOptionRequest("샷 추가", new BigDecimal("500.001")))).isNotEmpty();
    }

    private RecipeSaveRequest recipe(String quantity) {
        return new RecipeSaveRequest(List.of(new RecipeSaveRequest.Line(1L, new BigDecimal(quantity), null)));
    }
}
