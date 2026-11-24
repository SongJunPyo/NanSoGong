package com.nansogong.repository;

import com.nansogong.model.Menu;
import com.nansogong.model.MenuType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface MenuRepository extends JpaRepository<Menu, Long> {

    /** 매장의 기본 메뉴 목록 또는 옵션 목록 */
    List<Menu> findByStoreIdAndMenuType(Long storeId, MenuType menuType);

    /** 기본 메뉴에 붙은 옵션 목록 */
    List<Menu> findByParentMenuId(Long parentMenuId);
}
