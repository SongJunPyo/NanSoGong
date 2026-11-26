package com.nansogong.dto;

import com.nansogong.model.ItemType;
import com.nansogong.model.ItemUnit;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.Set;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;

/** 품목 등록 입력 검증 (DB 없이). 수량은 경계값(0, 음수, 소수 자릿수)을 넣어 본다 */
class InventoryItemCreateRequestTest {

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

    private Set<String> invalidFields(InventoryItemCreateRequest request) {
        return validator.validate(request).stream()
                .map(ConstraintViolation::getPropertyPath)
                .map(Object::toString)
                .collect(Collectors.toSet());
    }

    private InventoryItemCreateRequest withPackSize(String packSize) {
        return new InventoryItemCreateRequest("원두", ItemType.INGREDIENT, "커피", ItemUnit.G, "봉",
                packSize == null ? null : new BigDecimal(packSize));
    }

    @Test
    void 필수값만_있으면_통과한다() {
        var request = new InventoryItemCreateRequest("우유", ItemType.INGREDIENT, null, ItemUnit.ML, null, null);
        assertThat(invalidFields(request)).isEmpty();
    }

    @Test
    void 품목명_종류_관리단위가_없으면_실패한다() {
        var request = new InventoryItemCreateRequest("  ", null, null, null, null, null);
        assertThat(invalidFields(request)).containsExactlyInAnyOrder("name", "itemType", "unit");
    }

    @Test
    void 포장규격은_0보다_커야_한다() {
        assertThat(invalidFields(withPackSize("0"))).containsExactly("packSize");
        assertThat(invalidFields(withPackSize("-1"))).containsExactly("packSize");
        assertThat(invalidFields(withPackSize("0.001"))).isEmpty();
    }

    @Test
    void 포장규격은_소수_셋째_자리까지만_받는다() {
        assertThat(invalidFields(withPackSize("18.5"))).isEmpty();
        assertThat(invalidFields(withPackSize("1000.125"))).isEmpty();
        assertThat(invalidFields(withPackSize("1000.1255"))).containsExactly("packSize");
    }

    @Test
    void 글자수_제한을_넘으면_실패한다() {
        var request = new InventoryItemCreateRequest("가".repeat(101), ItemType.PACKAGING, "가".repeat(51),
                ItemUnit.EA, "가".repeat(11), null);
        assertThat(invalidFields(request)).containsExactlyInAnyOrder("name", "category", "purchaseUnit");
    }
}
