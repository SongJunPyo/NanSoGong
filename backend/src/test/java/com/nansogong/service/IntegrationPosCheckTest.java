package com.nansogong.service;

import com.nansogong.TestcontainersConfig;
import com.nansogong.model.Integration;
import com.nansogong.model.IntegrationProvider;
import com.nansogong.model.Member;
import com.nansogong.model.Store;
import com.nansogong.repository.IntegrationRepository;
import com.nansogong.repository.MemberRepository;
import com.nansogong.repository.StoreRepository;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** IntegrationService.checkPosIntegration: 판매 저장이 받은 연동이 이 매장의 POS 연동인지 (#66) */
@SpringBootTest
@Import(TestcontainersConfig.class)
@Transactional
class IntegrationPosCheckTest {

    @Autowired IntegrationService integrationService;
    @Autowired MemberRepository memberRepository;
    @Autowired StoreRepository storeRepository;
    @Autowired IntegrationRepository integrationRepository;
    @Autowired JdbcTemplate jdbcTemplate;
    @Autowired EntityManager entityManager;

    Long storeId, otherStoreId, posId;

    @BeforeEach
    void setUp() {
        Long memberId = memberRepository.save(Member.create("pos-check-test", "hash", "사장", "010-0000-0003")).getId();
        storeId = storeRepository.save(Store.create(memberId, "%09d1".formatted(memberId), "내카페", "사장", LocalDate.of(2023, 1, 1))).getId();
        Long otherMemberId = memberRepository.save(Member.create("pos-check-other", "hash", "남", "010-0000-0004")).getId();
        otherStoreId = storeRepository.save(Store.create(otherMemberId, "%09d1".formatted(otherMemberId), "남의카페", "남", LocalDate.of(2023, 1, 1))).getId();
        posId = connect(storeId, IntegrationProvider.TOSS_PLACE, "TP-CHECK-1");
    }

    @Test
    void 내_매장_POS_연동이면_통과() {
        assertThatCode(() -> integrationService.checkPosIntegration(storeId, posId)).doesNotThrowAnyException();
    }

    @Test
    void 연결을_해제한_POS_연동도_통과() {
        // status 는 보지 않는다: 해제 후 데이터 보존 범위가 미정이라 늦게 온 판매도 받는다
        jdbcTemplate.update("UPDATE integration SET status = 'DISCONNECTED', disconnected_at = now() WHERE integration_id = ?", posId);
        entityManager.clear();   // 위에서 저장한 엔티티 대신 DB 의 해제 상태를 읽게 한다

        assertThatCode(() -> integrationService.checkPosIntegration(storeId, posId)).doesNotThrowAnyException();
    }

    @Test
    void 다른_매장_POS_연동이면_400() {
        Long theirPosId = connect(otherStoreId, IntegrationProvider.TOSS_PLACE, "TP-CHECK-2");
        assertBadRequest(() -> integrationService.checkPosIntegration(storeId, theirPosId));
    }

    @Test
    void 없는_연동이면_400() {
        assertBadRequest(() -> integrationService.checkPosIntegration(storeId, Long.MAX_VALUE));
    }

    @Test
    void POS가_아닌_연동이면_400() {
        Long bankId = connect(storeId, IntegrationProvider.OPEN_BANKING, "OB-CHECK-1");
        Long supplierId = connect(storeId, IntegrationProvider.SUPPLIER, "SP-CHECK-1");
        assertBadRequest(() -> integrationService.checkPosIntegration(storeId, bankId));
        assertBadRequest(() -> integrationService.checkPosIntegration(storeId, supplierId));
    }

    private Long connect(Long storeId, IntegrationProvider provider, String externalStoreId) {
        return integrationRepository.save(Integration.connect(storeId, provider, externalStoreId, "test/ref")).getId();
    }

    private void assertBadRequest(Runnable call) {
        assertThatThrownBy(call::run)
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(e -> assertThat(((ResponseStatusException) e).getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST));
    }
}
