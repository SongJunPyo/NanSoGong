package com.nansogong.repository;

import com.nansogong.model.Integration;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface IntegrationRepository extends JpaRepository<Integration, Long> {

    /** 매장의 연동 목록 (GET /integrations) */
    List<Integration> findByStoreId(Long storeId);

    /** 이 매장의 연동 하나 (다른 매장 연동이면 비어 있음) */
    Optional<Integration> findByIdAndStoreId(Long integrationId, Long storeId);
}
