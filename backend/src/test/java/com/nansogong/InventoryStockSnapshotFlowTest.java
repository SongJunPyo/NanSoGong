package com.nansogong;

import com.nansogong.dto.InventoryStockSummaryResponse;
import com.nansogong.model.InventoryItem;
import com.nansogong.model.InventoryStockCount;
import com.nansogong.model.InventoryTransaction;
import com.nansogong.model.InventoryTransactionType;
import com.nansogong.model.ItemType;
import com.nansogong.model.ItemUnit;
import com.nansogong.model.Member;
import com.nansogong.model.Store;
import com.nansogong.repository.InventoryItemRepository;
import com.nansogong.repository.InventoryStockCountRepository;
import com.nansogong.repository.InventoryTransactionRepository;
import com.nansogong.repository.MemberRepository;
import com.nansogong.repository.StoreRepository;
import com.nansogong.service.InventoryStockService;
import org.aopalliance.intercept.MethodInterceptor;
import org.junit.jupiter.api.Test;
import org.springframework.aop.framework.ProxyFactory;
import org.springframework.beans.factory.config.BeanPostProcessor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.PageRequest;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 재고 현황 목록이 조회 도중 저장된 실사와 섞이지 않는지 확인한다 (실제 DB, Testcontainers).
 * 기준점 조회 직후 다른 연결에서 실사를 저장해 "조회 사이에 저장이 끼어든" 상황을 매번 같게 만든다.
 */
@SpringBootTest
@Import({TestcontainersConfig.class, InventoryStockSnapshotFlowTest.HookConfig.class})
class InventoryStockSnapshotFlowTest {

    /** 기준점 조회(findLatestBasesByStoreId)가 끝난 직후 한 번 실행할 일 */
    static final AtomicReference<Runnable> AFTER_BASES = new AtomicReference<>();

    /** 실사 Repository 를 감싸서 기준점 조회 뒤에 AFTER_BASES 를 실행한다 (테스트 전용) */
    @TestConfiguration
    static class HookConfig {
        @Bean
        static BeanPostProcessor afterBasesHook() {
            return new BeanPostProcessor() {
                @Override
                public Object postProcessAfterInitialization(Object bean, String beanName) {
                    if (!(bean instanceof InventoryStockCountRepository)) {
                        return bean;
                    }
                    ProxyFactory factory = new ProxyFactory();
                    factory.setTarget(bean);
                    factory.addInterface(InventoryStockCountRepository.class);
                    factory.addAdvice((MethodInterceptor) invocation -> {
                        Object result = invocation.proceed();
                        if (invocation.getMethod().getName().equals("findLatestBasesByStoreId")) {
                            Runnable hook = AFTER_BASES.getAndSet(null);
                            if (hook != null) {
                                hook.run();
                            }
                        }
                        return result;
                    });
                    return factory.getProxy();
                }
            };
        }
    }

    @Autowired
    private InventoryStockService inventoryStockService;
    @Autowired
    private MemberRepository memberRepository;
    @Autowired
    private StoreRepository storeRepository;
    @Autowired
    private InventoryItemRepository inventoryItemRepository;
    @Autowired
    private InventoryStockCountRepository inventoryStockCountRepository;
    @Autowired
    private InventoryTransactionRepository inventoryTransactionRepository;

    private final Instant t0 = Instant.now().minus(Duration.ofDays(1)).truncatedTo(ChronoUnit.HOURS);

    @Test
    void 조회_중에_실사가_저장돼도_한_시점의_수량만_나온다() {
        Long memberId = memberRepository.save(
                Member.create("t" + UUID.randomUUID().toString().substring(0, 20), "hash", "테스트", "010-0000-0000")).getId();
        Long storeId = storeRepository.save(
                Store.create(memberId, "%09d1".formatted(memberId), "테스트카페", "테스트", LocalDate.of(2026, 1, 1))).getId();
        Long milkId = inventoryItemRepository.save(
                InventoryItem.create(storeId, "우유", ItemType.INGREDIENT, null, ItemUnit.ML, null, null)).getId();

        // 초기 100 → 판매 −50 = 50 (저장 전 정답)
        inventoryStockCountRepository.save(InventoryStockCount.initial(storeId, milkId, new BigDecimal("100"), t0, null));
        inventoryTransactionRepository.save(InventoryTransaction.record(storeId, milkId, InventoryTransactionType.SALE,
                new BigDecimal("-50"), t0.plus(Duration.ofHours(1)), "TEST:" + UUID.randomUUID(), null));

        // 첫 조회의 기준점 조회가 끝난 직후, 다른 연결에서 실사 80 을 저장하고 커밋한다 (저장 후 정답 80)
        AFTER_BASES.set(() -> CompletableFuture.runAsync(() -> inventoryStockCountRepository.save(InventoryStockCount.count(
                storeId, milkId, new BigDecimal("50"), new BigDecimal("80"), t0.plus(Duration.ofHours(2)), null))).join());

        List<InventoryStockSummaryResponse> content = inventoryStockService
                .getStockSummaries(memberId, storeId, null, null, null, PageRequest.of(0, 20)).getContent();

        // 섞이면 옛 기준점 100 + 새 기준점 뒤 변동 0 = 100 이 나온다
        assertThat(content).hasSize(1);
        assertThat(content.get(0).estimatedQty()).isEqualByComparingTo("50");
        assertThat(content.get(0).baseType()).hasToString("INITIAL");

        // 다음 조회부터는 새 실사 기준
        List<InventoryStockSummaryResponse> after = inventoryStockService
                .getStockSummaries(memberId, storeId, null, null, null, PageRequest.of(0, 20)).getContent();
        assertThat(after.get(0).estimatedQty()).isEqualByComparingTo("80");
    }
}
