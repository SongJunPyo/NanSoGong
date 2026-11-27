package com.nansogong.repository;

import com.nansogong.model.Store;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Collection;

public interface StoreRepository extends JpaRepository<Store, Long> {

    /** 내 매장 목록 (GET /api/stores) */
    List<Store> findByMemberId(Long memberId);

    Page<Store> findByMemberId(Long memberId, Pageable pageable);

    boolean existsByBizRegNoIn(Collection<String> bizRegNos);

    @Query(value = "SELECT 1 FROM pg_advisory_xact_lock(2, hashtext(:bizRegNo))", nativeQuery = true)
    Integer lockRegistration(@Param("bizRegNo") String bizRegNo);

    /** 내 매장인지 확인 (StoreService.checkOwner) */
    boolean existsByIdAndMemberId(Long storeId, Long memberId);
}
