package com.nansogong.repository;

import com.nansogong.model.InventoryStockCount;
import com.nansogong.model.InventoryStockCountType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

public interface InventoryStockCountRepository extends JpaRepository<InventoryStockCount, Long> {

    /** 품목에 이 종류의 기록이 있는지 (초기 재고 중복 확인) */
    boolean existsByItemIdAndCountType(Long itemId, InventoryStockCountType countType);

    /** 품목의 가장 최근 기준점 (기준 일시 순). (item_id, counted_at) UNIQUE 라 같은 시각은 없다 */
    Optional<InventoryStockCount> findFirstByItemIdOrderByCountedAtDesc(Long itemId);

    /** at 시각 이하에서 가장 최근 기준점 (특정 시각의 추정 재고를 계산할 때) */
    Optional<InventoryStockCount> findFirstByItemIdAndCountedAtLessThanEqualOrderByCountedAtDesc(Long itemId, Instant at);

    /** 재고 현황용: 매장 품목마다 asOf 이하 가장 최근 기준점 한 줄씩 (기준점이 없는 품목은 빠진다) */
    @Query("""
            select c from InventoryStockCount c
            where c.storeId = :storeId
              and c.countedAt = (select max(c2.countedAt) from InventoryStockCount c2
                                 where c2.itemId = c.itemId and c2.countedAt <= :asOf)
            """)
    List<InventoryStockCount> findLatestBasesByStoreId(@Param("storeId") Long storeId, @Param("asOf") Instant asOf);

    /** 품목의 실사 기록 (초기 재고 포함). 정렬은 Pageable 로 (기본: 기준 일시 최신순) */
    Page<InventoryStockCount> findByItemId(Long itemId, Pageable pageable);
}
