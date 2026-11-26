package com.nansogong.repository;

import com.nansogong.model.InventoryTransaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.Instant;

public interface InventoryTransactionRepository extends JpaRepository<InventoryTransaction, Long> {

    /**
     * 기준 시각 이후(초과)에 발생한 변동량 합. 변동이 없으면 null.
     * 기준 시각 이전 · 같은 시각의 변동은 기준 수량에 이미 포함된 것으로 보고 더하지 않는다 (늦게 들어온 것도 마찬가지).
     */
    @Query("select sum(t.qtyDelta) from InventoryTransaction t where t.itemId = :itemId and t.occurredAt > :after")
    BigDecimal sumQtyDeltaAfter(@Param("itemId") Long itemId, @Param("after") Instant after);
}
