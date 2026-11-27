package com.nansogong.service;

import com.nansogong.dto.InventoryItemResponse;
import com.nansogong.dto.RecipeContextResponse;
import com.nansogong.dto.RecipeDraftValidateRequest;
import com.nansogong.dto.RecipeDraftValidateResponse;
import com.nansogong.dto.RecipeDraftValidateResponse.Reason;
import com.nansogong.model.ItemCost;
import com.nansogong.model.ItemUnit;
import com.nansogong.model.Menu;
import com.nansogong.model.MenuSaleStatus;
import com.nansogong.model.MenuType;
import com.nansogong.model.RecipeItem;
import com.nansogong.repository.ItemCostRepository;
import com.nansogong.repository.MenuRepository;
import com.nansogong.repository.RecipeItemRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * AI 레시피 초안용 맥락 조회 · 초안 검증 (#35 ① ②, UF-15).
 * AI 는 DB 를 직접 보지 않으므로 Spring 이 매장 재료를 알려 주고, AI 가 만든 초안을 매장 품목 · 단위 · 단가 기준으로 확인한다.
 * 저장은 하지 않는다 (확인된 초안은 제안으로 저장되고, 사장님이 추가를 누를 때 레시피 저장 규칙으로 다시 검증된다).
 *
 * 내부 API(/internal/ai-jobs/{jobId}/…)에 연결할 때는 ai_job 행의 매장 · 요청 사용자를 넘긴다 (요청 본문의 storeId 를 쓰지 않음).
 */
@Service
@RequiredArgsConstructor
public class RecipeDraftService {

    /** 초안 단위 → 품목 관리 단위와 곱할 값. 여기 없는 단위는 UNKNOWN_UNIT */
    private static final Map<String, Conversion> UNITS = Map.of(
            "G", new Conversion(ItemUnit.G, BigDecimal.ONE),
            "KG", new Conversion(ItemUnit.G, BigDecimal.valueOf(1000)),
            "ML", new Conversion(ItemUnit.ML, BigDecimal.ONE),
            "L", new Conversion(ItemUnit.ML, BigDecimal.valueOf(1000)),
            "EA", new Conversion(ItemUnit.EA, BigDecimal.ONE));

    private record Conversion(ItemUnit unit, BigDecimal factor) {}

    private final StoreService storeService;
    private final InventoryItemService inventoryItemService;   // 품목(준표)은 service 로만 부른다
    private final MenuRepository menuRepository;
    private final RecipeItemRepository recipeItemRepository;
    private final ItemCostRepository itemCostRepository;

    /** ① 매장의 사용 중 품목(현재 단가 포함)과 기본 메뉴별 지금 레시피 */
    @Transactional(readOnly = true)
    public RecipeContextResponse context(Long memberId, Long storeId) {
        storeService.checkOwner(memberId, storeId);
        Map<Long, ItemCost> costs = currentCosts(storeId);

        List<RecipeContextResponse.Item> items = activeItems(memberId, storeId).stream()
                .map(i -> {
                    ItemCost cost = costs.get(i.id());
                    return new RecipeContextResponse.Item(i.id(), i.name(), i.unit(),
                            cost == null ? null : cost.getUnitCost(), cost == null ? null : cost.getSource());
                })
                .toList();

        Map<Long, List<RecipeItem>> recipeByMenu = recipeItemRepository.findByStoreIdAndValidToIsNull(storeId).stream()
                .collect(Collectors.groupingBy(RecipeItem::getMenuId));
        // 레시피에는 사용 중지된 품목이 남아 있을 수 있어서 이름 · 단위는 번호로 따로 가져온다
        Set<Long> recipeItemIds = recipeByMenu.values().stream().flatMap(List::stream)
                .map(RecipeItem::getItemId).collect(Collectors.toSet());
        Map<Long, InventoryItemResponse> recipeItems = inventoryItemService.getItemsByIds(storeId, recipeItemIds);

        List<RecipeContextResponse.Menu> menus = menuRepository.findByStoreIdAndMenuTypeOrderByIdAsc(storeId, MenuType.MENU).stream()
                .filter(m -> m.getSaleStatus() != MenuSaleStatus.INACTIVE)
                .map(m -> toContextMenu(m, recipeByMenu.getOrDefault(m.getId(), List.of()), recipeItems))
                .toList();
        return new RecipeContextResponse(items, menus);
    }

    /**
     * ② AI 초안 검증. 줄마다 매장 품목을 찾고, 관리 단위로 바꾸고, 현재 단가로 원가를 계산한다. 매장에 없는 재료는 새 재료(NEW_ITEM)로 통과시킨다.
     * 하나라도 ok 가 아니면 valid = false (AI 가 reason 을 보고 고친다). 단가가 없는 품목은 valid 를 막지 않고 missingCosts 로 알린다.
     */
    @Transactional(readOnly = true)
    public RecipeDraftValidateResponse validate(Long memberId, Long storeId, RecipeDraftValidateRequest request) {
        storeService.checkOwner(memberId, storeId);
        List<RecipeDraftValidateRequest.Line> lines = request.lines();

        Set<Long> requestedIds = lines.stream().map(RecipeDraftValidateRequest.Line::itemId)
                .filter(Objects::nonNull).collect(Collectors.toSet());
        Map<Long, InventoryItemResponse> byId = inventoryItemService.getItemsByIds(storeId, requestedIds);   // 다른 매장 · 없는 품목은 빠진다
        // 이름으로 찾을 때: 사용 중 품목에서 찾고, 없으면 사용 중지 품목 이름인지 본다 (같은 재료를 새 재료로 다시 등록하지 않게)
        List<InventoryItemResponse> allItems = allItems(memberId, storeId);
        Map<String, List<InventoryItemResponse>> activeByName = allItems.stream().filter(InventoryItemResponse::active)
                .collect(Collectors.groupingBy(i -> nameKey(i.name())));
        Set<String> inactiveNames = allItems.stream().filter(i -> !i.active())
                .map(i -> nameKey(i.name())).collect(Collectors.toSet());
        Map<Long, ItemCost> costs = currentCosts(storeId);

        List<RecipeDraftValidateResponse.Line> results = new ArrayList<>();
        List<Long> missingCosts = new ArrayList<>();
        Set<Long> seenItemIds = new HashSet<>();
        Set<String> seenNewNames = new HashSet<>();
        BigDecimal total = BigDecimal.ZERO;
        boolean allOk = true;
        boolean hasNewItem = false;

        for (RecipeDraftValidateRequest.Line line : lines) {
            InventoryItemResponse item = null;
            boolean newItem = false;
            Reason reason = null;

            if (line.itemId() != null) {
                item = byId.get(line.itemId());
                if (item == null) {
                    reason = Reason.ITEM_NOT_FOUND;        // 번호를 줬는데 없음 · 다른 매장 품목
                } else if (!item.active()) {
                    reason = Reason.ITEM_INACTIVE;
                }
            } else {
                String key = nameKey(line.itemName());
                List<InventoryItemResponse> found = activeByName.getOrDefault(key, List.of());
                if (found.size() > 1) {
                    reason = Reason.ITEM_AMBIGUOUS;
                } else if (found.size() == 1) {
                    item = found.get(0);
                } else if (inactiveNames.contains(key)) {
                    reason = Reason.ITEM_INACTIVE;          // 사용 중지 품목과 같은 이름 → 새 재료로 보지 않는다
                } else {
                    newItem = true;                         // 매장에 없는 새 재료 (문제 아님)
                }
            }
            if (reason == null && !newItem && !seenItemIds.add(item.id())) {
                reason = Reason.DUPLICATE_ITEM;
            }
            if (reason == null && newItem && !seenNewNames.add(nameKey(line.itemName()))) {
                reason = Reason.DUPLICATE_ITEM;             // 같은 새 재료가 두 번
            }
            Conversion conversion = UNITS.get(line.unit().strip().toUpperCase(Locale.ROOT));
            if (reason == null && conversion == null) {
                reason = Reason.UNKNOWN_UNIT;
            }
            if (reason == null && !newItem && conversion.unit() != item.unit()) {
                reason = Reason.UNIT_MISMATCH;
            }
            BigDecimal normalized = null;
            if (reason == null) {
                normalized = line.quantity().multiply(conversion.factor()).setScale(3, RoundingMode.HALF_UP);   // 레시피 수량은 소수 3자리
                if (normalized.signum() <= 0) {
                    reason = Reason.INVALID_QTY;
                }
            }

            if (reason != null) {
                allOk = false;
                results.add(new RecipeDraftValidateResponse.Line(false, reason,
                        item == null ? null : item.id(), null, item == null ? null : item.unit(), null));
                continue;
            }

            if (newItem) {
                hasNewItem = true;   // 단가를 알 수 없어 원가 합계를 내지 않는다
                results.add(new RecipeDraftValidateResponse.Line(true, Reason.NEW_ITEM, null, normalized, conversion.unit(), null));
                continue;
            }

            ItemCost cost = costs.get(item.id());
            BigDecimal unitCost = cost == null ? null : cost.getUnitCost();
            if (unitCost == null) {
                missingCosts.add(item.id());   // 확인되지 않은 단가는 만들어 넣지 않는다
            } else {
                total = total.add(normalized.multiply(unitCost));
            }
            results.add(new RecipeDraftValidateResponse.Line(true, null, item.id(), normalized, item.unit(), unitCost));
        }

        BigDecimal totalCost = allOk && !hasNewItem && missingCosts.isEmpty() ? total.setScale(2, RoundingMode.HALF_UP) : null;
        return new RecipeDraftValidateResponse(allOk, results, List.of(), totalCost, missingCosts);
    }

    private RecipeContextResponse.Menu toContextMenu(Menu menu, List<RecipeItem> recipe, Map<Long, InventoryItemResponse> items) {
        List<RecipeContextResponse.Line> lines = recipe.stream()
                .map(r -> {
                    InventoryItemResponse item = items.get(r.getItemId());
                    return new RecipeContextResponse.Line(r.getItemId(), item == null ? null : item.name(),
                            item == null ? null : item.unit(), r.getQuantity(), r.getAppliesTo());
                })
                .toList();
        return new RecipeContextResponse.Menu(menu.getId(), menu.getName(), menu.getCategory(), menu.getPrice(), lines);
    }

    /** 매장의 품목 전체 (사용 중지 포함, 이름 순) */
    private List<InventoryItemResponse> allItems(Long memberId, Long storeId) {
        return inventoryItemService.getItems(memberId, storeId, null, null, Pageable.unpaged(Sort.by("name"))).getContent();
    }

    /** 매장의 사용 중 품목 전체 (이름 순) */
    private List<InventoryItemResponse> activeItems(Long memberId, Long storeId) {
        return inventoryItemService.getItems(memberId, storeId, null, true, Pageable.unpaged(Sort.by("name"))).getContent();
    }

    /** 품목별 현재 단가 (단가 기록이 없는 품목은 없음) */
    private Map<Long, ItemCost> currentCosts(Long storeId) {
        return itemCostRepository.findLatestByStoreId(storeId, Instant.now()).stream()
                .collect(Collectors.toMap(ItemCost::getItemId, Function.identity(), (a, b) -> a));
    }

    /** 이름 비교용: 앞뒤 공백 무시, 영문 대소문자 무시 */
    private static String nameKey(String name) {
        return name.strip().toLowerCase(Locale.ROOT);
    }
}
