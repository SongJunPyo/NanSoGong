package com.nansogong.service;

import com.nansogong.dto.InventoryInitialStockRequest;
import com.nansogong.dto.InventoryStockCountResponse;
import com.nansogong.dto.InventoryStockResponse;
import com.nansogong.model.InventoryItem;
import com.nansogong.model.InventoryStockCount;
import com.nansogong.model.InventoryStockCountType;
import com.nansogong.repository.InventoryItemRepository;
import com.nansogong.repository.InventoryStockCountRepository;
import com.nansogong.repository.InventoryTransactionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.Instant;

/**
 * 초기 재고 입력과 현재 추정 재고 계산 (구현-3-2, 3-4, 3-5). 규칙은 docs/rules/domain.md 재고 계산.
 *
 * TODO(매장 분리): 모든 메서드 맨 앞에서 StoreService.checkOwner(memberId, storeId) 를 부른다 (docs/rules/db.md 매장 분리).
 *   StoreService 가 아직 dev 에 없어서 비워 두었다. 그 전까지는 다른 매장 품목에 접근해도 403 이 나지 않는다.
 * TODO(예외): 공용 BusinessException · GlobalExceptionHandler 가 생기면 ResponseStatusException 을 업무 예외로 바꾼다.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class InventoryStockService {

    private final InventoryItemRepository inventoryItemRepository;
    private final InventoryStockCountRepository inventoryStockCountRepository;
    private final InventoryTransactionRepository inventoryTransactionRepository;

    /**
     * 초기 재고 입력. 품목당 한 번만 (다시 넣으면 409, 이후 수정은 실사로).
     * 품목 행을 잠근 뒤 확인하므로 같은 품목에 동시에 두 번 요청해도 하나만 저장된다.
     */
    @Transactional
    public InventoryStockCountResponse setInitialStock(Long memberId, Long storeId, Long itemId,
                                                       InventoryInitialStockRequest request) {
        InventoryItem item = inventoryItemRepository.findByIdAndStoreIdForUpdate(itemId, storeId)
                .orElseThrow(() -> itemNotFound(itemId));
        if (!item.isActive()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "사용 중지된 품목에는 초기 재고를 입력할 수 없습니다: " + itemId);
        }
        Instant countedAt = request.countedAt().toInstant();
        if (countedAt.isAfter(Instant.now())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "기준 일시는 미래일 수 없습니다");
        }
        if (inventoryStockCountRepository.existsByItemIdAndCountType(itemId, InventoryStockCountType.INITIAL)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "초기 재고가 이미 있습니다. 수량을 고치려면 실사를 등록하세요: " + itemId);
        }
        InventoryStockCount initial = InventoryStockCount.initial(storeId, itemId, request.countedQty(), countedAt, request.memo());
        inventoryStockCountRepository.saveAndFlush(initial);
        log.info("초기 재고 입력 storeId={} itemId={} stockCountId={}", storeId, itemId, initial.getId());
        return InventoryStockCountResponse.from(initial);
    }

    /** 현재 추정 재고 = 가장 최근 기준점 수량 + 기준 시각 이후 장부 변동 합. 기준점이 없으면 미설정 */
    @Transactional(readOnly = true)
    public InventoryStockResponse getStock(Long memberId, Long storeId, Long itemId) {
        InventoryItem item = inventoryItemRepository.findByIdAndStoreId(itemId, storeId)
                .orElseThrow(() -> itemNotFound(itemId));
        Instant now = Instant.now();
        return inventoryStockCountRepository.findFirstByItemIdOrderByCountedAtDesc(itemId)
                .map(base -> {
                    BigDecimal change = inventoryTransactionRepository.sumQtyDeltaAfter(itemId, base.getCountedAt());
                    return InventoryStockResponse.of(itemId, item.getUnit(), base, change == null ? BigDecimal.ZERO : change, now);
                })
                .orElseGet(() -> InventoryStockResponse.notInitialized(itemId, item.getUnit(), now));
    }

    private ResponseStatusException itemNotFound(Long itemId) {
        return new ResponseStatusException(HttpStatus.NOT_FOUND, "품목을 찾을 수 없습니다: " + itemId);
    }
}
