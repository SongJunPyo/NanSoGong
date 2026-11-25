package com.nansogong.service;

import com.nansogong.dto.OptionQty;
import com.nansogong.model.RecipeAppliesTo;
import com.nansogong.model.RecipeItem;
import com.nansogong.repository.RecipeItemRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;

/** 레시피. 레시피 저장 API 는 준표 ItemService(같은 매장 품목 · 단위 확인)가 나온 뒤 추가한다. */
@Service
@RequiredArgsConstructor
public class RecipeService {

    private final RecipeItemRepository recipeItemRepository;

    /**
     * 메뉴 1개(+ 옵션들)를 at 시각에 만들 때 품목별 사용량 (AGENTS.md 3-5 계약, 준표 deductForSale 에서 부른다).
     * 사용량 = 기본 레시피 + Σ(옵션 레시피 × 옵션 qty). 판매 수량을 곱하는 건 부르는 쪽(준표)이 한다.
     *
     * - at: 판매 시각. 레시피가 바뀌었어도 그 판매 당시 레시피로 계산한다 (valid_from ~ valid_to)
     * - 지금은 applies_to = ALL 행만 계산한다. 매장/포장 구분은 주문 유형을 받게 되면 추가 (3주차 예정)
     * - 결과가 비어 있으면 기본 레시피가 없다는 뜻 → 부르는 쪽에서 NEEDS_FIX
     * - 사용량이 정확히 0 이 된 품목은 뺀다 (예: 디카페인 변경으로 원두 -18 + 18)
     *
     * @return itemId → 관리 단위 사용량 (g · ml · 개)
     */
    @Transactional(readOnly = true)
    public Map<Long, BigDecimal> usageOf(Long menuId, List<OptionQty> options, Instant at) {
        Set<Long> menuIds = new HashSet<>();
        menuIds.add(menuId);
        options.stream().map(OptionQty::menuId).filter(Objects::nonNull).forEach(menuIds::add);

        Map<Long, List<RecipeItem>> recipeByMenu = new HashMap<>();
        for (RecipeItem r : recipeItemRepository.findValidAt(menuIds, RecipeAppliesTo.ALL, at)) {
            recipeByMenu.computeIfAbsent(r.getMenuId(), k -> new java.util.ArrayList<>()).add(r);
        }

        List<RecipeItem> baseRecipe = recipeByMenu.getOrDefault(menuId, List.of());
        if (baseRecipe.isEmpty()) {
            return Map.of();   // 기본 레시피 없음
        }

        Map<Long, BigDecimal> usage = new HashMap<>();
        add(usage, baseRecipe, BigDecimal.ONE);
        for (OptionQty option : options) {
            if (option.menuId() == null || option.qty() == 0) {
                continue;      // 제외된 옵션 → 사용량 0
            }
            add(usage, recipeByMenu.getOrDefault(option.menuId(), List.of()), BigDecimal.valueOf(option.qty()));
        }
        usage.values().removeIf(q -> q.signum() == 0);
        return usage;
    }

    /** 레시피 행들의 수량 × times 를 품목별로 더한다 */
    private void add(Map<Long, BigDecimal> usage, List<RecipeItem> recipe, BigDecimal times) {
        for (RecipeItem r : recipe) {
            usage.merge(r.getItemId(), r.getQuantity().multiply(times), BigDecimal::add);
        }
    }
}
