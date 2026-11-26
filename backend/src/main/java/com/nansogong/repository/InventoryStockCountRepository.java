package com.nansogong.repository;

import com.nansogong.model.InventoryStockCount;
import com.nansogong.model.InventoryStockCountType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.Optional;

public interface InventoryStockCountRepository extends JpaRepository<InventoryStockCount, Long> {

    /** 품목에 이 종류의 기록이 있는지 (초기 재고 중복 확인) */
    boolean existsByItemIdAndCountType(Long itemId, InventoryStockCountType countType);

    /** 품목의 가장 최근 기준점 (기준 일시 순). (item_id, counted_at) UNIQUE 라 같은 시각은 없다 */
    Optional<InventoryStockCount> findFirstByItemIdOrderByCountedAtDesc(Long itemId);

    /** at 시각 이하에서 가장 최근 기준점 (특정 시각의 추정 재고를 계산할 때) */
    Optional<InventoryStockCount> findFirstByItemIdAndCountedAtLessThanEqualOrderByCountedAtDesc(Long itemId, Instant at);
}
