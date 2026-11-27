package com.nansogong.service;

import com.nansogong.dto.StoreRegistrationRequest;
import com.nansogong.dto.StoreResponse;
import com.nansogong.dto.StoreUpdateRequest;
import com.nansogong.model.Store;
import com.nansogong.repository.StoreRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class StoreService {
    private static final List<String> WEEK_DAYS = List.of("mon", "tue", "wed", "thu", "fri", "sat", "sun");
    private static final Set<String> SORT_FIELDS = Set.of("id", "name", "bizName", "bizRegNo", "ownerName",
            "businessOpenedOn", "verifyStatus", "verifiedAt", "category", "address", "createdAt", "updatedAt");
    private final StoreRepository storeRepository;

    @Transactional(readOnly = true)
    public void checkOwner(Long memberId, Long storeId) {
        if (!storeRepository.existsByIdAndMemberId(storeId, memberId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "내 매장만 조회하거나 수정할 수 있어요");
        }
    }

    @Transactional(readOnly = true)
    public Page<StoreResponse> listMine(Long memberId, Pageable pageable) {
        if (pageable.getSort().stream().anyMatch(order -> !SORT_FIELDS.contains(order.getProperty()))) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "정렬할 수 없는 매장 항목이 포함되어 있어요");
        }
        return storeRepository.findByMemberId(memberId, pageable).map(StoreResponse::from);
    }

    @Transactional(readOnly = true)
    public StoreResponse getMine(Long memberId, Long storeId) {
        checkOwner(memberId, storeId);
        return StoreResponse.from(storeRepository.findById(storeId).orElseThrow());
    }

    @Transactional(readOnly = true)
    public void checkRegistrationNumbers(List<StoreRegistrationRequest> stores) {
        if (storeRepository.existsByBizRegNoIn(stores.stream().map(StoreRegistrationRequest::bizRegNo).toList())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "이미 다른 계정이나 매장에 등록된 사업자등록번호가 있어요");
        }
    }

    /** 새 회원 ID는 가입 서버가 정한다. 인증된 사업자 목록을 같은 가입 트랜잭션에서 저장한다. */
    @Transactional(propagation = Propagation.MANDATORY)
    public void registerVerified(Long memberId, List<StoreRegistrationRequest> stores) {
        stores.stream().map(StoreRegistrationRequest::bizRegNo).sorted().forEach(storeRepository::lockRegistration);
        checkRegistrationNumbers(stores);
        storeRepository.saveAllAndFlush(stores.stream().map(input -> Store.createVerified(memberId, input.bizRegNo(), input.bizName(),
                input.ownerName(), LocalDate.parse(input.openingDate(), DateTimeFormatter.BASIC_ISO_DATE))).toList());
    }

    @Transactional
    public StoreResponse updateBasics(Long memberId, Long storeId, StoreUpdateRequest request) {
        checkOwner(memberId, storeId);
        if (request.openTime().isEmpty() != request.closeTime().isEmpty()
                || (!request.openTime().isEmpty() && request.openTime().equals(request.closeTime()))
                || new HashSet<>(request.closedDays()).size() != request.closedDays().size()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "시작·마감 시간과 중복되지 않는 휴무일을 확인해 주세요");
        }
        Map<String, List<String>> hours = new LinkedHashMap<>();
        if (!request.openTime().isEmpty()) {
            for (String day : WEEK_DAYS) {
                if (!request.closedDays().contains(day)) hours.put(day, List.of(request.openTime(), request.closeTime()));
            }
        }
        Store store = storeRepository.findById(storeId).orElseThrow();
        store.configureBasics(request.name(), request.category(), request.address(), hours, request.closedDays());
        return StoreResponse.from(store);
    }
}
