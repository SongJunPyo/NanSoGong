package com.nansogong.repository;

import com.nansogong.model.Menu;
import com.nansogong.model.MenuType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface MenuRepository extends JpaRepository<Menu, Long> {

    /** 매장의 기본 메뉴 목록 또는 옵션 목록 (번호 순) */
    List<Menu> findByStoreIdAndMenuTypeOrderByIdAsc(Long storeId, MenuType menuType);

    /** 기본 메뉴에 붙은 옵션 목록 */
    List<Menu> findByParentMenuIdOrderByIdAsc(Long parentMenuId);

    /** 이 매장의 메뉴 하나 (다른 매장 메뉴면 비어 있음) */
    Optional<Menu> findByIdAndStoreId(Long menuId, Long storeId);
}
