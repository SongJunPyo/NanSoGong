package com.nansogong.service;

import com.nansogong.model.Integration;
import com.nansogong.model.IntegrationProvider;
import com.nansogong.repository.IntegrationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/**
 * 연동 (POS · 공급처 · 금융). 지금은 판매 저장이 부르는 POS 연동 확인만 있다 (#66, #54 합의 3).
 * TODO: 공용 BusinessException 이 생기면 ResponseStatusException 을 업무 예외로 바꾼다.
 */
@Service
@RequiredArgsConstructor
public class IntegrationService {

    private final IntegrationRepository integrationRepository;

    /**
     * integrationId 가 이 매장의 POS 연동인지 확인한다 (준표 saveOrders 가 맨 앞에서 한 번 부른다).
     * - 화면에서 부르는 API 가 아니라 서버 안에서 부르는 함수라 checkOwner 를 하지 않는다 (MenuService.resolve 와 같음)
     * - status 는 보지 않는다: 연결 해제 후 데이터 보존 범위가 미정이라 해제된 연동의 늦은 판매도 받는다
     *
     * @throws ResponseStatusException 400: 연동이 없거나 다른 매장 것이거나 POS 연동(TOSS_PLACE)이 아닐 때
     */
    @Transactional(readOnly = true)
    public void checkPosIntegration(Long storeId, Long integrationId) {
        Integration integration = integrationRepository.findByIdAndStoreId(integrationId, storeId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "이 매장의 연동이 아닙니다: " + integrationId));
        if (integration.getProvider() != IntegrationProvider.TOSS_PLACE) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "POS 연동이 아닙니다: " + integrationId);
        }
    }
}
