package com.nansogong.repository;

import com.nansogong.model.InventoryTransaction;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
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

    /**
     * 재고 현황용: 매장 품목마다 (asOf 이하 가장 최근 기준 시각 초과 ~ asOf 이하) 변동량 합.
     * sumQtyDeltaBetween 을 품목 수만큼 부르지 않으려고 한 번에 계산한다. 변동이 없는 품목은 빠진다.
     */
    @Query("""
            select t.itemId as itemId, sum(t.qtyDelta) as qty
            from InventoryTransaction t, InventoryStockCount c
            where c.storeId = :storeId and t.itemId = c.itemId
              and c.countedAt = (select max(c2.countedAt) from InventoryStockCount c2
                                 where c2.itemId = c.itemId and c2.countedAt <= :asOf)
              and t.occurredAt > c.countedAt and t.occurredAt <= :asOf
            group by t.itemId
            """)
    List<ItemQtySum> sumChangeSinceLatestBaseByStoreId(@Param("storeId") Long storeId, @Param("asOf") Instant asOf);

    /** 재고 현황용: 매장 품목마다 asOf 이하 마지막 변동 발생 시각 */
    @Query("""
            select t.itemId as itemId, max(t.occurredAt) as lastAt
            from InventoryTransaction t
            where t.storeId = :storeId and t.occurredAt <= :asOf
            group by t.itemId
            """)
    List<ItemLastChange> findLastChangeByStoreId(@Param("storeId") Long storeId, @Param("asOf") Instant asOf);

    /** 품목의 장부 기록. 정렬은 Pageable 로 (기본: 발생 시각 최신순) */
    Page<InventoryTransaction> findByItemId(Long itemId, Pageable pageable);

    interface ItemQtySum {
        Long getItemId();
        BigDecimal getQty();
    }

    interface ItemLastChange {
        Long getItemId();
        Instant getLastAt();
    }
}
