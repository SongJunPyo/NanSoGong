package com.nansogong.repository;

import com.nansogong.model.Store;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface StoreRepository extends JpaRepository<Store, Long> {

    /** 내 매장 목록 (GET /api/stores) */
    List<Store> findByMemberId(Long memberId);

    /** 내 매장인지 확인 (StoreService.checkOwner) */
    boolean existsByIdAndMemberId(Long storeId, Long memberId);
}
