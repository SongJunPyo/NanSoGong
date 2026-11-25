package com.nansogong.service;

import com.nansogong.dto.StoreResponse;
import com.nansogong.repository.StoreRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

/**
 * 매장.
 * checkOwner 는 매장 데이터를 다루는 모든 서비스 메서드 맨 앞에서 부른다 (AGENTS.md 3-2 매장 분리).
 * TODO: 공용 BusinessException 이 생기면 ResponseStatusException 을 업무 예외로 바꾼다.
 */
@Service
@RequiredArgsConstructor
public class StoreService {

    private final StoreRepository storeRepository;

    /** 내 매장인지 확인. 남의 매장이거나 없는 매장이면 403 (없는 매장인지도 알려 주지 않는다) */
    @Transactional(readOnly = true)
    public void checkOwner(Long memberId, Long storeId) {
        if (!storeRepository.existsByIdAndMemberId(storeId, memberId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "접근할 수 없는 매장입니다");
        }
    }

    /** 내 매장 목록 */
    @Transactional(readOnly = true)
    public List<StoreResponse> getMyStores(Long memberId) {
        return storeRepository.findByMemberId(memberId).stream()
                .map(StoreResponse::from)
                .toList();
    }

    /** 매장 상세 (내 매장만) */
    @Transactional(readOnly = true)
    public StoreResponse getStore(Long memberId, Long storeId) {
        checkOwner(memberId, storeId);
        return storeRepository.findById(storeId)
                .map(StoreResponse::from)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "접근할 수 없는 매장입니다"));
    }
}
