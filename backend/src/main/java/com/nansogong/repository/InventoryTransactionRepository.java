package com.nansogong.repository;

import com.nansogong.model.InventoryTransaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Optional;

public interface InventoryTransactionRepository extends JpaRepository<InventoryTransaction, Long> {

    /**
     * 기준 시각 초과 ~ upTo 이하에 발생한 변동량 합. 변동이 없으면 null.
     * 기준 시각 이전 · 같은 시각의 변동은 기준 수량에 이미 포함된 것으로 보고 더하지 않는다 (늦게 들어온 것도 마찬가지).
     */
    @Query("""
            select sum(t.qtyDelta) from InventoryTransaction t
            where t.itemId = :itemId and t.occurredAt > :after and t.occurredAt <= :upTo
            """)
    BigDecimal sumQtyDeltaBetween(@Param("itemId") Long itemId, @Param("after") Instant after, @Param("upTo") Instant upTo);

    /** 같은 중복 방지 키로 이미 기록한 변동 (재요청이면 이 행을 돌려준다) */
    Optional<InventoryTransaction> findByIdempotencyKeyAndItemId(String idempotencyKey, Long itemId);
}
