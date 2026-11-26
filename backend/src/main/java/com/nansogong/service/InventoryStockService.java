package com.nansogong.service;

import com.nansogong.dto.InventoryStockAdjustmentRequest;
import com.nansogong.dto.InventoryStockCountRequest;
import com.nansogong.dto.InventoryStockCountResponse;
import com.nansogong.dto.InventoryStockResponse;
import com.nansogong.dto.InventoryTransactionResponse;
import com.nansogong.model.InventoryItem;
import com.nansogong.model.InventoryStockCount;
import com.nansogong.model.InventoryStockCountType;
import com.nansogong.model.InventoryTransaction;
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
import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * 재고 수량: 초기 재고 · 실사 · 폐기 · 손실 기록과 추정 재고 계산 (구현-3-2, 3-4, 3-5, 3-6, UF-09 ~ 11).
 * 규칙은 docs/rules/domain.md 재고 계산.
 * 기록하는 메서드는 모두 품목 행을 잠그고 확인한다 → 같은 품목에 동시에 요청이 와도 확인과 저장이 섞이지 않는다.
 *
 * TODO(매장 분리): 모든 메서드 맨 앞에서 StoreService.checkOwner(memberId, storeId) 를 부른다 (docs/rules/db.md 매장 분리).
 *   StoreService 가 아직 dev 에 없어서 비워 두었다. 그 전까지는 다른 매장 품목에 접근해도 403 이 나지 않는다.
 * TODO(예외): 공용 BusinessException · GlobalExceptionHandler 가 생기면 ResponseStatusException 을 업무 예외로 바꾼다.
 * TODO(원가): 폐기 · 손실의 unit_cost(발생 시점 단가 사본)는 단가 이력(item_cost) 조회 계약이 정해지면 채운다. 지금은 비워 둔다.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class InventoryStockService {

    /** 폐기 · 손실 중복 방지 키 앞부분. 판매 차감(SALE:) · 취소 환원(CANCEL:) 키와 겹치지 않게 한다 */
    private static final String ADJUSTMENT_KEY_PREFIX = "ADJUST:";
    /** idempotency_key 칸이 VARCHAR(100) 이라 앞부분(ADJUST:)을 빼고 남는 길이 */
    private static final int MAX_CLIENT_KEY_LENGTH = 100 - ADJUSTMENT_KEY_PREFIX.length();

    private final InventoryItemRepository inventoryItemRepository;
    private final InventoryStockCountRepository inventoryStockCountRepository;
    private final InventoryTransactionRepository inventoryTransactionRepository;

    /** 초기 재고 입력. 품목당 한 번만 (다시 넣으면 409, 이후 수정은 실사로) */
    @Transactional
    public InventoryStockCountResponse setInitialStock(Long memberId, Long storeId, Long itemId,
                                                       InventoryStockCountRequest request) {
        lockActiveItem(storeId, itemId, "초기 재고를 입력할");
        Instant countedAt = notFuture(request.countedAt(), "기준 일시");
        if (inventoryStockCountRepository.existsByItemIdAndCountType(itemId, InventoryStockCountType.INITIAL)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "초기 재고가 이미 있습니다. 수량을 고치려면 실사를 등록하세요: " + itemId);
        }
        InventoryStockCount initial = InventoryStockCount.initial(storeId, itemId, request.countedQty(), countedAt, request.memo());
        inventoryStockCountRepository.saveAndFlush(initial);
        log.info("초기 재고 입력 storeId={} itemId={} stockCountId={}", storeId, itemId, initial.getId());
        return InventoryStockCountResponse.from(initial);
    }

    /**
     * 실사 등록 (UF-11 3A). 그 시각의 추정 재고를 서버가 계산해 함께 남기고, 실제 수량이 새 기준점이 된다.
     * 가장 최근 기준점보다 뒤 시각이어야 한다 (같은 시각 409, 앞 시각 400).
     */
    @Transactional
    public InventoryStockCountResponse recordCount(Long memberId, Long storeId, Long itemId, InventoryStockCountRequest request) {
        lockActiveItem(storeId, itemId, "실사를 등록할");
        Instant countedAt = notFuture(request.countedAt(), "실사 일시");
        InventoryStockCount latest = requireAfterLatestBase(itemId, countedAt, "실사 일시", true);
        BigDecimal estimated = latest.getCountedQty().add(changeBetween(itemId, latest.getCountedAt(), countedAt));

        InventoryStockCount count = InventoryStockCount.count(storeId, itemId, estimated, request.countedQty(), countedAt, request.memo());
        inventoryStockCountRepository.saveAndFlush(count);
        log.info("실사 등록 storeId={} itemId={} stockCountId={}", storeId, itemId, count.getId());
        return InventoryStockCountResponse.from(count);
    }

    /**
     * 폐기 · 손실 등록 (UF-11 3B). 줄어든 양을 장부에 음수로 기록한다.
     * idempotencyKey(Idempotency-Key 헤더)가 같은 재요청이면 새로 기록하지 않고 처음 기록을 돌려준다. 없으면 서버가 만든다.
     */
    @Transactional
    public InventoryTransactionResponse recordAdjustment(Long memberId, Long storeId, Long itemId,
                                                         InventoryStockAdjustmentRequest request, String idempotencyKey) {
        lockActiveItem(storeId, itemId, "폐기 · 손실을 등록할");
        String clientKey = idempotencyKey == null || idempotencyKey.isBlank() ? UUID.randomUUID().toString() : idempotencyKey.strip();
        if (clientKey.length() > MAX_CLIENT_KEY_LENGTH) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Idempotency-Key 는 " + MAX_CLIENT_KEY_LENGTH + "자 이하여야 합니다");
        }
        String key = ADJUSTMENT_KEY_PREFIX + clientKey;
        var existing = inventoryTransactionRepository.findByIdempotencyKeyAndItemId(key, itemId);
        if (existing.isPresent()) {
            log.info("폐기 · 손실 재요청 무시 storeId={} itemId={} txnId={}", storeId, itemId, existing.get().getId());
            return InventoryTransactionResponse.from(existing.get());
        }
        Instant occurredAt = notFuture(request.occurredAt(), "발생 시각");
        requireAfterLatestBase(itemId, occurredAt, "발생 시각", false);

        InventoryTransaction txn = InventoryTransaction.record(storeId, itemId, request.type().toTransactionType(),
                request.qty().negate(), occurredAt, key, request.memo());
        inventoryTransactionRepository.saveAndFlush(txn);
        log.info("{} 등록 storeId={} itemId={} txnId={}", request.type(), storeId, itemId, txn.getId());
        return InventoryTransactionResponse.from(txn);
    }

    /**
     * 추정 재고 = at 시각 이하 가장 최근 기준점 수량 + (기준 시각 초과 ~ at 이하) 장부 변동 합. 기준점이 없으면 미설정.
     * at 이 없으면 지금. 실사 · 폐기를 저장하기 전에 "그 시각에 얼마로 계산되는지" 미리 보여 줄 때도 쓴다.
     */
    @Transactional(readOnly = true)
    public InventoryStockResponse getStock(Long memberId, Long storeId, Long itemId, OffsetDateTime at) {
        InventoryItem item = inventoryItemRepository.findByIdAndStoreId(itemId, storeId)
                .orElseThrow(() -> itemNotFound(itemId));
        Instant asOf = at == null ? Instant.now() : at.toInstant();
        return inventoryStockCountRepository.findFirstByItemIdAndCountedAtLessThanEqualOrderByCountedAtDesc(itemId, asOf)
                .map(base -> InventoryStockResponse.of(itemId, item.getUnit(), base,
                        changeBetween(itemId, base.getCountedAt(), asOf), asOf))
                .orElseGet(() -> InventoryStockResponse.notInitialized(itemId, item.getUnit(), asOf));
    }

    /** 기록 전에 품목을 잠그고 가져온다. 없거나 다른 매장 것이면 404, 사용 중지면 400 */
    private InventoryItem lockActiveItem(Long storeId, Long itemId, String action) {
        InventoryItem item = inventoryItemRepository.findByIdAndStoreIdForUpdate(itemId, storeId)
                .orElseThrow(() -> itemNotFound(itemId));
        if (!item.isActive()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "사용 중지된 품목에는 " + action + " 수 없습니다: " + itemId);
        }
        return item;
    }

    private Instant notFuture(OffsetDateTime at, String label) {
        Instant instant = at.toInstant();
        if (instant.isAfter(Instant.now())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, label + "는 미래일 수 없습니다");
        }
        return instant;
    }

    /**
     * 초기 재고가 있어야 하고, at 이 가장 최근 기준점보다 뒤여야 한다.
     * 기준 시각 이전 · 같은 시각의 변동은 계산에 들어가지 않으므로 (기준 수량에 포함된 것으로 본다) 받지 않는다.
     * sameTimeIsConflict: 실사는 같은 시각이면 중복 기록이라 409, 폐기 · 손실은 400
     */
    private InventoryStockCount requireAfterLatestBase(Long itemId, Instant at, String label, boolean sameTimeIsConflict) {
        InventoryStockCount latest = inventoryStockCountRepository.findFirstByItemIdOrderByCountedAtDesc(itemId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "초기 재고를 먼저 입력하세요: " + itemId));
        if (sameTimeIsConflict && at.equals(latest.getCountedAt())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, label + "가 가장 최근 기준점과 같습니다: " + latest.getCountedAt());
        }
        if (!at.isAfter(latest.getCountedAt())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    label + "는 가장 최근 기준점(" + latest.getCountType() + " " + latest.getCountedAt() + ") 이후여야 합니다");
        }
        return latest;
    }

    private BigDecimal changeBetween(Long itemId, Instant after, Instant upTo) {
        BigDecimal sum = inventoryTransactionRepository.sumQtyDeltaBetween(itemId, after, upTo);
        return sum == null ? BigDecimal.ZERO : sum;
    }

    private ResponseStatusException itemNotFound(Long itemId) {
        return new ResponseStatusException(HttpStatus.NOT_FOUND, "품목을 찾을 수 없습니다: " + itemId);
    }
}
