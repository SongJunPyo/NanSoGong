package com.nansogong.repository;

import com.nansogong.model.InventoryItem;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface InventoryItemRepository extends JpaRepository<InventoryItem, Long> {

    /** 매장의 품목 하나. 다른 매장 품목이면 비어 있다 */
    Optional<InventoryItem> findByIdAndStoreId(Long itemId, Long storeId);

    /**
     * 매장의 품목 하나를 잠그고 가져온다 (SELECT … FOR UPDATE). 트랜잭션이 끝날 때까지 같은 품목을 잠그려는 요청은 기다린다.
     * 초기 재고처럼 "품목당 한 번" 인 기록을 동시에 두 번 저장하지 않으려고 쓴다.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select i from InventoryItem i where i.id = :itemId and i.storeId = :storeId")
    Optional<InventoryItem> findByIdAndStoreIdForUpdate(@Param("itemId") Long itemId, @Param("storeId") Long storeId);

    /** 매장의 품목 목록 (이름 검색). name 이 "" 이면 전체 */
    Page<InventoryItem> findByStoreIdAndNameContainingIgnoreCase(Long storeId, String name, Pageable pageable);

    /** 매장의 품목 목록 (이름 검색 + 사용 여부) */
    Page<InventoryItem> findByStoreIdAndActiveAndNameContainingIgnoreCase(Long storeId, boolean active, String name, Pageable pageable);

    /** 같은 매장에 같은 이름의 사용 중 품목이 있는지 (등록할 때) */
    boolean existsByStoreIdAndNameAndActiveTrue(Long storeId, String name);

    /** 같은 매장에 같은 이름의 사용 중 품목이 자기 말고 있는지 (수정할 때) */
    boolean existsByStoreIdAndNameAndActiveTrueAndIdNot(Long storeId, String name, Long itemId);
}
