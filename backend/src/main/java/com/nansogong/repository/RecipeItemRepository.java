package com.nansogong.repository;

import com.nansogong.model.RecipeAppliesTo;
import com.nansogong.model.RecipeItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.Collection;
import java.util.List;

public interface RecipeItemRepository extends JpaRepository<RecipeItem, Long> {

    /** 지금 쓰는 레시피 (아직 끝나지 않은 행) */
    List<RecipeItem> findByMenuIdAndValidToIsNull(Long menuId);

    /** 매장 전체 메뉴의 지금 레시피 (메뉴마다 조회하지 않게 한 번에) */
    List<RecipeItem> findByStoreIdAndValidToIsNull(Long storeId);

    /** 여러 메뉴의 레시피 중 at 시각에 적용되던 행 (valid_from ≤ at < valid_to) */
    @Query("""
            select r from RecipeItem r
            where r.menuId in :menuIds
              and r.appliesTo = :appliesTo
              and r.validFrom <= :at
              and (r.validTo is null or r.validTo > :at)
            """)
    List<RecipeItem> findValidAt(@Param("menuIds") Collection<Long> menuIds,
                                 @Param("appliesTo") RecipeAppliesTo appliesTo,
                                 @Param("at") Instant at);
}
