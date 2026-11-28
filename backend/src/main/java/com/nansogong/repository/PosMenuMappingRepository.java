package com.nansogong.repository;

import com.nansogong.model.PosMappingStatus;
import com.nansogong.model.PosMenuMapping;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface PosMenuMappingRepository extends JpaRepository<PosMenuMapping, Long> {

    /** 한 POS 연동에서 메뉴 · 옵션 코드 하나로 연결 찾기 (UNIQUE 라 하나뿐). 기본 메뉴는 posOptionCode = "" */
    Optional<PosMenuMapping> findByIntegrationIdAndPosMenuCodeAndPosOptionCode(Long integrationId, String posMenuCode, String posOptionCode);

    /** 연결 상태별 목록 (GET /menus/pos-mappings?status=UNMAPPED) */
    List<PosMenuMapping> findByStoreIdAndStatus(Long storeId, PosMappingStatus status);

    /**
     * 한 POS 연동 · 한 메뉴 코드의 기본 메뉴("") · 옵션 코드들 연결을 한 번에 (MenuService.resolve).
     * 연동이 둘이면 같은 코드가 연동마다 있을 수 있어서 연동 기준으로 찾고, 다른 매장 연결을 읽지 않게 매장도 함께 건다
     */
    List<PosMenuMapping> findByStoreIdAndIntegrationIdAndPosMenuCodeAndPosOptionCodeIn(
            Long storeId, Long integrationId, String posMenuCode, Collection<String> posOptionCodes);
}
