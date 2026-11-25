package com.nansogong.service;

import com.nansogong.dto.InventoryItemResponse;
import com.nansogong.model.InventoryItem;
import com.nansogong.model.ItemUnit;
import com.nansogong.repository.InventoryItemRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.Collection;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * 품목. 담당: 준표.
 * 레시피(예원)가 쓰는 메서드 3개와 목록 조회만 먼저 만들었다 (준표 동의). 품목 등록 · 수정 API 는 준표가 추가한다.
 * TODO: 공용 BusinessException 이 생기면 ResponseStatusException 을 업무 예외로 바꾼다.
 */
@Service
@RequiredArgsConstructor
public class InventoryItemService {

    private final StoreService storeService;
    private final InventoryItemRepository itemRepository;

    /** 매장의 사용 중인 품목 목록 (레시피 화면에서 품목을 고를 때) */
    @Transactional(readOnly = true)
    public List<InventoryItemResponse> getItems(Long memberId, Long storeId) {
        storeService.checkOwner(memberId, storeId);
        return itemRepository.findByStoreIdAndIsActiveTrueOrderByNameAsc(storeId).stream()
                .map(InventoryItemResponse::from)
                .toList();
    }

    /** 품목 하나. 없으면 404 */
    @Transactional(readOnly = true)
    public InventoryItemResponse getItem(Long itemId) {
        return InventoryItemResponse.from(find(itemId));
    }

    /** 품목의 관리 단위 (G · ML · EA) */
    @Transactional(readOnly = true)
    public ItemUnit getUnit(Long itemId) {
        return find(itemId).getUnit();
    }

    /** 품목들이 모두 이 매장 것인지 확인. 하나라도 없거나 다른 매장 것이면 400 */
    @Transactional(readOnly = true)
    public void validateSameStore(Long storeId, Collection<Long> itemIds) {
        Set<Long> ids = new HashSet<>(itemIds);
        List<InventoryItem> items = itemRepository.findAllById(ids);
        boolean allFound = items.size() == ids.size();
        boolean sameStore = items.stream().allMatch(i -> i.getStoreId().equals(storeId));
        if (!allFound || !sameStore) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "이 매장의 품목이 아닙니다");
        }
    }

    private InventoryItem find(Long itemId) {
        return itemRepository.findById(itemId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "품목을 찾을 수 없습니다"));
    }
}
