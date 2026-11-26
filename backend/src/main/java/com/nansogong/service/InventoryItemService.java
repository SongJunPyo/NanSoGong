package com.nansogong.service;

import com.nansogong.dto.InventoryItemCreateRequest;
import com.nansogong.dto.InventoryItemResponse;
import com.nansogong.dto.InventoryItemUpdateRequest;
import com.nansogong.model.InventoryItem;
import com.nansogong.repository.InventoryItemRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.Collection;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * 재고 품목 등록 · 수정 · 조회 · 사용 중지 (구현-3-1, UF-09).
 *
 * TODO(매장 분리): 모든 메서드 맨 앞에서 StoreService.checkOwner(memberId, storeId) 를 부른다 (docs/rules/db.md 매장 분리).
 *   StoreService 가 아직 dev 에 없어서 비워 두었다. 그 전까지는 다른 매장 품목에 접근해도 403 이 나지 않는다.
 * TODO(예외): 공용 BusinessException · GlobalExceptionHandler 가 생기면 ResponseStatusException 을
 *   InventoryItemNotFoundException · InventoryItemDuplicateNameException 같은 업무 예외로 바꾼다.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class InventoryItemService {

    private final InventoryItemRepository inventoryItemRepository;

    /** 품목 등록. 같은 매장에 같은 이름의 사용 중 품목이 있으면 409 */
    @Transactional
    public InventoryItemResponse create(Long memberId, Long storeId, InventoryItemCreateRequest request) {
        String name = request.name().strip();
        if (inventoryItemRepository.existsByStoreIdAndNameAndActiveTrue(storeId, name)) {
            throw duplicateName(name);
        }
        InventoryItem item = InventoryItem.create(storeId, name, request.itemType(), request.category(), request.unit(),
                request.purchaseUnit(), request.packSize());
        inventoryItemRepository.saveAndFlush(item);   // 응답에 생성 시각을 채우려고 바로 저장한다
        log.info("품목 등록 storeId={} itemId={}", storeId, item.getId());
        return InventoryItemResponse.from(item);
    }

    /** 품목 목록. name 은 부분 검색 (없으면 전체), active 가 없으면 사용 여부와 관계없이 전체 */
    @Transactional(readOnly = true)
    public Page<InventoryItemResponse> getItems(Long memberId, Long storeId, String name, Boolean active, Pageable pageable) {
        String keyword = name == null ? "" : name.strip();
        Page<InventoryItem> items = active == null
                ? inventoryItemRepository.findByStoreIdAndNameContainingIgnoreCase(storeId, keyword, pageable)
                : inventoryItemRepository.findByStoreIdAndActiveAndNameContainingIgnoreCase(storeId, active, keyword, pageable);
        return items.map(InventoryItemResponse::from);
    }

    /** 품목 하나. 없거나 다른 매장 품목이면 404 */
    @Transactional(readOnly = true)
    public InventoryItemResponse getItem(Long memberId, Long storeId, Long itemId) {
        return InventoryItemResponse.from(find(storeId, itemId));
    }

    /** 품목 수정. 관리 단위는 바꾸지 않는다. 사용 중 품목끼리 이름이 겹치면 409 */
    @Transactional
    public InventoryItemResponse update(Long memberId, Long storeId, Long itemId, InventoryItemUpdateRequest request) {
        InventoryItem item = find(storeId, itemId);
        String name = request.name().strip();
        if (item.isActive() && inventoryItemRepository.existsByStoreIdAndNameAndActiveTrueAndIdNot(storeId, name, itemId)) {
            throw duplicateName(name);
        }
        item.update(name, request.itemType(), request.category(), request.purchaseUnit(), request.packSize());
        inventoryItemRepository.flush();   // 응답에 수정 시각을 채우려고 바로 반영한다
        log.info("품목 수정 storeId={} itemId={}", storeId, itemId);
        return InventoryItemResponse.from(item);
    }

    /** 사용 중지. 지우지 않는다 (장부 · 레시피가 참조한다). 이미 중지된 품목이면 그대로 둔다 */
    @Transactional
    public void deactivate(Long memberId, Long storeId, Long itemId) {
        InventoryItem item = find(storeId, itemId);
        item.deactivate();
        log.info("품목 사용 중지 storeId={} itemId={}", storeId, itemId);
    }

    // ─── 다른 도메인이 부르는 메서드 (docs/rules/domain.md 도메인 사이 메서드 계약) ───
    // 부르는 쪽이 이미 checkOwner 로 매장 권한을 확인했다고 보고, 여기서는 품목이 그 매장 것인지만 본다.

    /**
     * 품목들이 모두 이 매장 것인지 한 번에 확인한다 (레시피 저장 등). 하나라도 없거나 다른 매장 것이면 400.
     * 같은 id 가 여러 번 와도 한 번으로 센다. 비어 있으면 확인할 것이 없으므로 통과한다.
     * 사용 중지 여부는 보지 않는다.
     */
    @Transactional(readOnly = true)
    public void validateSameStore(Long storeId, Collection<Long> itemIds) {
        Set<Long> ids = distinctIds(itemIds);
        if (ids.isEmpty()) {
            return;
        }
        Set<Long> found = inventoryItemRepository.findByStoreIdAndIdIn(storeId, ids).stream()
                .map(InventoryItem::getId)
                .collect(Collectors.toSet());
        if (!found.containsAll(ids)) {
            Set<Long> missing = new HashSet<>(ids);
            missing.removeAll(found);
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "이 매장의 품목이 아닙니다: " + missing);
        }
    }

    /**
     * 품목 여러 개를 id 로 가져온다 (화면에 이름 · 단위를 보여 줄 때). itemId → 품목.
     * 없거나 다른 매장 품목은 결과에서 빠진다 (예외 없음). 모두 있어야 하면 validateSameStore 를 먼저 부른다.
     */
    @Transactional(readOnly = true)
    public Map<Long, InventoryItemResponse> getItemsByIds(Long storeId, Collection<Long> itemIds) {
        Set<Long> ids = distinctIds(itemIds);
        if (ids.isEmpty()) {
            return Map.of();
        }
        return inventoryItemRepository.findByStoreIdAndIdIn(storeId, ids).stream()
                .collect(Collectors.toMap(InventoryItem::getId, InventoryItemResponse::from));
    }

    private Set<Long> distinctIds(Collection<Long> itemIds) {
        if (itemIds == null) {
            return Set.of();
        }
        Set<Long> ids = new HashSet<>(itemIds);
        ids.remove(null);
        return ids;
    }

    private InventoryItem find(Long storeId, Long itemId) {
        return inventoryItemRepository.findByIdAndStoreId(itemId, storeId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "품목을 찾을 수 없습니다: " + itemId));
    }

    private ResponseStatusException duplicateName(String name) {
        return new ResponseStatusException(HttpStatus.CONFLICT, "같은 이름의 사용 중인 품목이 있습니다: " + name);
    }
}
