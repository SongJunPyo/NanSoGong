package com.nansogong.repository;

import com.nansogong.model.ItemCost;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

public interface ItemCostRepository extends JpaRepository<ItemCost, Long> {

    /** at 시각에 적용되는 단가 (그 시각 이전 것 중 가장 최근) */
    Optional<ItemCost> findFirstByItemIdAndEffectiveFromLessThanEqualOrderByEffectiveFromDesc(Long itemId, Instant at);

    /** 매장 품목별로 at 시각에 적용되는 단가 하나씩 (품목 수만큼 조회하지 않게 한 번에). 단가 기록이 없는 품목은 빠진다 */
    @Query(value = """
            SELECT DISTINCT ON (item_id) *
            FROM item_cost
            WHERE store_id = :storeId AND effective_from <= :at
            ORDER BY item_id, effective_from DESC, item_cost_id DESC
            """, nativeQuery = true)
    List<ItemCost> findLatestByStoreId(@Param("storeId") Long storeId, @Param("at") Instant at);
}
