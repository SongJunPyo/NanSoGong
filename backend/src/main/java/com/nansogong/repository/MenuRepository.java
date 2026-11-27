package com.nansogong.repository;

import com.nansogong.model.Menu;
import com.nansogong.model.MenuType;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface MenuRepository extends JpaRepository<Menu, Long> {

    /** 매장의 기본 메뉴 목록 또는 옵션 목록 (번호 순) */
    List<Menu> findByStoreIdAndMenuTypeOrderByIdAsc(Long storeId, MenuType menuType);

    /** 기본 메뉴에 붙은 옵션 목록 */
    List<Menu> findByParentMenuIdOrderByIdAsc(Long parentMenuId);

    /** 이 매장의 메뉴 하나 (다른 매장 메뉴면 비어 있음) */
    Optional<Menu> findByIdAndStoreId(Long menuId, Long storeId);

    /**
     * 위와 같지만 메뉴 행을 잠근다 (SELECT ... FOR UPDATE).
     * 같은 메뉴 레시피를 동시에 저장하면 뒤에 온 쪽은 앞의 저장이 끝날 때까지 기다린다.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select m from Menu m where m.id = :menuId and m.storeId = :storeId")
    Optional<Menu> findByIdAndStoreIdForUpdate(@Param("menuId") Long menuId, @Param("storeId") Long storeId);
}
