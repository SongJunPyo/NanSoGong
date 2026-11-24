package com.nansogong.repository;

import com.nansogong.model.RecipeItem;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface RecipeItemRepository extends JpaRepository<RecipeItem, Long> {

    /** 지금 쓰는 레시피 (아직 끝나지 않은 행) */
    List<RecipeItem> findByMenuIdAndValidToIsNull(Long menuId);
}
