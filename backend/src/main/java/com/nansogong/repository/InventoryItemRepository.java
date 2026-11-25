package com.nansogong.repository;

import com.nansogong.model.InventoryItem;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface InventoryItemRepository extends JpaRepository<InventoryItem, Long> {

    /** 매장의 사용 중인 품목 (이름 순) */
    List<InventoryItem> findByStoreIdAndIsActiveTrueOrderByNameAsc(Long storeId);
}
