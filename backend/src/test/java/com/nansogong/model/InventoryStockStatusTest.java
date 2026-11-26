package com.nansogong.model;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static com.nansogong.model.InventoryStockStatus.CHECK_NEEDED;
import static com.nansogong.model.InventoryStockStatus.ENOUGH;
import static com.nansogong.model.InventoryStockStatus.NOT_INITIALIZED;
import static com.nansogong.model.InventoryStockStatus.NO_THRESHOLD;
import static com.nansogong.model.InventoryStockStatus.SHORTAGE;
import static org.assertj.core.api.Assertions.assertThat;

/** 재고 상태 판단 (DB 없이). 경계값: null · 음수 · 0 · 기준과 같음 · 소수 */
class InventoryStockStatusTest {

    private InventoryStockStatus status(String estimated, String reorderPoint) {
        return InventoryStockStatus.of(estimated == null ? null : new BigDecimal(estimated),
                reorderPoint == null ? null : new BigDecimal(reorderPoint));
    }

    @Test
    void 초기재고가_없으면_기준이_있어도_미설정() {
        assertThat(status(null, null)).isEqualTo(NOT_INITIALIZED);
        assertThat(status(null, "1000")).isEqualTo(NOT_INITIALIZED);
    }

    @Test
    void 음수면_기준과_관계없이_기록_확인_필요() {
        assertThat(status("-0.001", null)).isEqualTo(CHECK_NEEDED);
        assertThat(status("-50", "1000")).isEqualTo(CHECK_NEEDED);
    }

    @Test
    void 영이면_기준이_없어도_부족() {
        assertThat(status("0", null)).isEqualTo(SHORTAGE);
        assertThat(status("0.000", "1000")).isEqualTo(SHORTAGE);
    }

    @Test
    void 기준이_없으면_판단_불가() {
        assertThat(status("0.001", null)).isEqualTo(NO_THRESHOLD);
        assertThat(status("5000", null)).isEqualTo(NO_THRESHOLD);
    }

    @Test
    void 기준_이하면_부족_초과면_충분() {
        assertThat(status("1000", "1000")).isEqualTo(SHORTAGE);
        assertThat(status("1000.000", "1000")).isEqualTo(SHORTAGE);   // 소수 자릿수가 달라도 같은 값
        assertThat(status("999.999", "1000")).isEqualTo(SHORTAGE);
        assertThat(status("1000.001", "1000")).isEqualTo(ENOUGH);
    }
}
