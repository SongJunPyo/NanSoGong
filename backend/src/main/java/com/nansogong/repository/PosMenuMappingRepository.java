package com.nansogong.repository;

import com.nansogong.model.PosMappingStatus;
import com.nansogong.model.PosMenuMapping;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface PosMenuMappingRepository extends JpaRepository<PosMenuMapping, Long> {

    /** POS 코드로 연결 찾기 (MenuService.resolve). 기본 메뉴는 posOptionCode = "" */
    Optional<PosMenuMapping> findByIntegrationIdAndPosMenuCodeAndPosOptionCode(Long integrationId, String posMenuCode, String posOptionCode);

    /** 연결 상태별 목록 (GET /menus/pos-mappings?status=UNMAPPED) */
    List<PosMenuMapping> findByStoreIdAndStatus(Long storeId, PosMappingStatus status);

    /** 한 메뉴 코드의 기본 메뉴("") · 옵션 코드들 연결을 한 번에 (MenuService.resolve) */
    List<PosMenuMapping> findByStoreIdAndPosMenuCodeAndPosOptionCodeIn(Long storeId, String posMenuCode, Collection<String> posOptionCodes);
}
