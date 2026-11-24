package com.nansogong.repository;

import com.nansogong.model.ItemCost;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.Optional;

public interface ItemCostRepository extends JpaRepository<ItemCost, Long> {

    /** at 시각에 적용되는 단가 (그 시각 이전 것 중 가장 최근) */
    Optional<ItemCost> findFirstByItemIdAndEffectiveFromLessThanEqualOrderByEffectiveFromDesc(Long itemId, Instant at);
}
