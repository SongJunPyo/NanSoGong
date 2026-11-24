package com.nansogong.repository;

import com.nansogong.model.Integration;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface IntegrationRepository extends JpaRepository<Integration, Long> {

    /** 매장의 연동 목록 (GET /integrations) */
    List<Integration> findByStoreId(Long storeId);
}
