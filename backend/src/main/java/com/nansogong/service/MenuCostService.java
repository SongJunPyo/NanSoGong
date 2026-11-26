package com.nansogong.service;

import com.nansogong.dto.InventoryItemResponse;
import com.nansogong.dto.MenuCostResponse;
import com.nansogong.dto.MenuCostResponse.Line;
import com.nansogong.dto.MenuCostResponse.Status;
import com.nansogong.model.ItemCost;
import com.nansogong.model.Menu;
import com.nansogong.repository.ItemCostRepository;
import com.nansogong.repository.MenuRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;

/**
 * 메뉴 원가 · 원가율 · 1개당 매출총이익 (UF-15 ④).
 * 원가 = Σ(레시피 사용량 × 그 시점 단가). 레시피는 usageOf 와 같은 기준(at 시점, applies_to = ALL)으로 쓴다.
 * 단가가 없으면 0 으로 채우지 않는다 (docs/rules: 부족한 원가를 임의의 값으로 채우지 않음).
 */
@Service
@RequiredArgsConstructor
public class MenuCostService {

    private final StoreService storeService;
    private final RecipeService recipeService;
    private final InventoryItemService inventoryItemService;   // 품목(준표)은 service 로만 부른다
    private final MenuRepository menuRepository;
    private final ItemCostRepository itemCostRepository;

    @Transactional(readOnly = true)
    public MenuCostResponse getCost(Long memberId, Long storeId, Long menuId, Instant at) {
        storeService.checkOwner(memberId, storeId);
        Menu menu = menuRepository.findByIdAndStoreId(menuId, storeId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "메뉴를 찾을 수 없습니다"));
        Instant asOf = at == null ? Instant.now() : at;

        Map<Long, BigDecimal> usage = new TreeMap<>(recipeService.usageOf(menuId, List.of(), asOf));   // 품목 번호 순
        if (usage.isEmpty()) {
            return new MenuCostResponse(menuId, menu.getName(), menu.getPrice(), null, null, null,
                    Status.NO_RECIPE, List.of(), List.of(), asOf);
        }

        List<Line> lines = new ArrayList<>();
        List<Long> missing = new ArrayList<>();
        BigDecimal total = BigDecimal.ZERO;
        for (Map.Entry<Long, BigDecimal> e : usage.entrySet()) {
            Long itemId = e.getKey();
            BigDecimal qty = e.getValue();
            InventoryItemResponse item = inventoryItemService.getItem(memberId, storeId, itemId);
            BigDecimal unitCost = itemCostRepository
                    .findFirstByItemIdAndEffectiveFromLessThanEqualOrderByEffectiveFromDesc(itemId, asOf)
                    .map(ItemCost::getUnitCost)
                    .orElse(null);
            if (unitCost == null) {
                missing.add(itemId);
                lines.add(new Line(itemId, item.name(), item.unit(), qty, null, null));
                continue;
            }
            BigDecimal lineCost = qty.multiply(unitCost);
            total = total.add(lineCost);
            lines.add(new Line(itemId, item.name(), item.unit(), qty, unitCost, lineCost.setScale(2, RoundingMode.HALF_UP)));
        }

        if (!missing.isEmpty()) {
            return new MenuCostResponse(menuId, menu.getName(), menu.getPrice(), null, null, null,
                    Status.MISSING_COST, lines, missing, asOf);
        }
        BigDecimal cost = total.setScale(2, RoundingMode.HALF_UP);   // 금액은 DECIMAL(19,2)
        // 판매가가 0 이하(POS 에서 들어온 0원 메뉴 등)면 원가율을 계산할 수 없다 → null (0 으로 나누기 방지)
        BigDecimal costRate = menu.getPrice().signum() > 0
                ? cost.multiply(BigDecimal.valueOf(100)).divide(menu.getPrice(), 1, RoundingMode.HALF_UP)
                : null;
        BigDecimal grossProfit = menu.getPrice().subtract(cost);
        return new MenuCostResponse(menuId, menu.getName(), menu.getPrice(), cost, costRate, grossProfit,
                Status.COMPLETE, lines, List.of(), asOf);
    }
}
