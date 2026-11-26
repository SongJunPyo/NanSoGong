package com.nansogong.service;

import com.nansogong.dto.InventoryItemResponse;
import com.nansogong.dto.OptionQty;
import com.nansogong.dto.RecipeResponse;
import com.nansogong.dto.RecipeSaveRequest;
import com.nansogong.model.Menu;
import com.nansogong.model.RecipeAppliesTo;
import com.nansogong.model.RecipeItem;
import com.nansogong.model.RecipeSource;
import com.nansogong.repository.MenuRepository;
import com.nansogong.repository.RecipeItemRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;

/**
 * 레시피. 바꿀 때는 기존 행을 지우지 않고 닫는다(valid_to): 지난 판매의 재고 계산이 그때 레시피로 남는다.
 * TODO: 공용 BusinessException 이 생기면 ResponseStatusException 을 업무 예외로 바꾼다.
 */
@Service
@RequiredArgsConstructor
public class RecipeService {

    private final StoreService storeService;
    private final InventoryItemService inventoryItemService;   // 품목(준표) 은 service 로만 부른다
    private final MenuRepository menuRepository;
    private final RecipeItemRepository recipeItemRepository;

    /** 메뉴(또는 옵션)의 지금 레시피 */
    @Transactional(readOnly = true)
    public RecipeResponse getRecipe(Long memberId, Long storeId, Long menuId) {
        storeService.checkOwner(memberId, storeId);
        findMenu(storeId, menuId);
        return toResponse(memberId, storeId, menuId, recipeItemRepository.findByMenuIdAndValidToIsNull(menuId));
    }

    /**
     * 레시피 저장 (통째로 교체): 지금 레시피 행을 모두 닫고, 받은 내용으로 새 행을 만든다.
     * 검사: 내 매장 · 이 매장 메뉴 · 이 매장 품목(아니면 404) · 사용 중 품목 · 같은 품목 두 번 금지 · 기본 메뉴는 양수 / 옵션은 0 이 아닌 값
     */
    @Transactional
    public RecipeResponse saveRecipe(Long memberId, Long storeId, Long menuId, RecipeSaveRequest request) {
        storeService.checkOwner(memberId, storeId);
        // 메뉴 행을 잠근다: 같은 메뉴를 동시에 저장해도 '닫기 → 새로 넣기'가 한 번에 하나씩만 돌아서 열린 레시피가 2벌이 되지 않는다
        Menu menu = menuRepository.findByIdAndStoreIdForUpdate(menuId, storeId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "메뉴를 찾을 수 없습니다"));

        List<RecipeSaveRequest.Line> lines = request.items();
        Set<Long> itemIds = new HashSet<>();
        for (RecipeSaveRequest.Line line : lines) {
            if (!itemIds.add(line.itemId())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "같은 품목을 두 번 넣을 수 없습니다");
            }
            boolean invalid = menu.isOption() ? line.quantity().signum() == 0 : line.quantity().signum() <= 0;
            if (invalid) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        menu.isOption() ? "옵션 사용량은 0 일 수 없습니다" : "메뉴 사용량은 0 보다 커야 합니다");
            }
        }
        for (Long itemId : itemIds) {
            InventoryItemResponse item = inventoryItemService.getItem(memberId, storeId, itemId);   // 다른 매장 · 없는 품목이면 404
            if (!item.active()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "사용 중지된 품목은 레시피에 넣을 수 없습니다: " + item.name());
            }
        }

        Instant now = Instant.now();   // 잠금을 얻은 뒤의 시각 → 뒤에 저장한 쪽이 항상 더 늦은 시각
        recipeItemRepository.findByMenuIdAndValidToIsNull(menuId).forEach(old -> old.close(now));   // 지금 레시피 닫기
        List<RecipeItem> created = lines.stream()
                .map(line -> RecipeItem.create(storeId, menuId, line.itemId(), line.quantity(),
                        line.appliesTo() == null ? RecipeAppliesTo.ALL : line.appliesTo(), RecipeSource.OWNER, now))
                .toList();
        recipeItemRepository.saveAll(created);
        return toResponse(memberId, storeId, menuId, created);
    }


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

    /** 이 매장의 메뉴만. 다른 매장 메뉴 번호면 404 */
    private Menu findMenu(Long storeId, Long menuId) {
        return menuRepository.findByIdAndStoreId(menuId, storeId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "메뉴를 찾을 수 없습니다"));
    }

    private RecipeResponse toResponse(Long memberId, Long storeId, Long menuId, List<RecipeItem> rows) {
        List<RecipeResponse.Line> lines = rows.stream()
                .map(r -> {
                    InventoryItemResponse item = inventoryItemService.getItem(memberId, storeId, r.getItemId());
                    return new RecipeResponse.Line(r.getId(), r.getItemId(), item.name(), item.unit(),
                            r.getQuantity(), r.getAppliesTo(), r.getSource(), r.getValidFrom());
                })
                .toList();
        return new RecipeResponse(menuId, lines);
    }
}
