package com.nansogong;

import com.nansogong.dto.InventoryItemResponse;
import com.nansogong.model.InventoryItem;
import com.nansogong.model.ItemType;
import com.nansogong.model.ItemUnit;
import com.nansogong.model.Member;
import com.nansogong.model.Store;
import com.nansogong.repository.InventoryItemRepository;
import com.nansogong.repository.MemberRepository;
import com.nansogong.repository.StoreRepository;
import com.nansogong.service.InventoryItemService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** 다른 도메인(레시피 등)이 부르는 품목 메서드 계약 (docs/rules/domain.md 도메인 사이 메서드 계약) */
@SpringBootTest
@Import(TestcontainersConfig.class)
class InventoryItemContractTest {

    @Autowired
    private MemberRepository memberRepository;
    @Autowired
    private StoreRepository storeRepository;
    @Autowired
    private InventoryItemRepository inventoryItemRepository;
    @Autowired
    private InventoryItemService inventoryItemService;

    private Long storeId;
    private Long milkId;
    private Long beanId;
    private Long otherStoreItemId;

    @BeforeEach
    void setUp() {
        Member member = memberRepository.save(
                Member.create("t" + UUID.randomUUID().toString().substring(0, 20), "hash", "테스트", "010-0000-0000"));
        storeId = storeRepository.save(Store.create(member.getId(), "1234567890", "내카페", "테스트", LocalDate.of(2026, 1, 1))).getId();
        Long otherStoreId = storeRepository.save(Store.create(member.getId(), "9876543210", "다른카페", "테스트", LocalDate.of(2026, 1, 1))).getId();
        milkId = item(storeId, "우유", ItemUnit.ML).getId();
        beanId = item(storeId, "원두", ItemUnit.G).getId();
        otherStoreItemId = item(otherStoreId, "다른매장 우유", ItemUnit.ML).getId();
    }

    private InventoryItem item(Long storeId, String name, ItemUnit unit) {
        return inventoryItemRepository.save(InventoryItem.create(storeId, name, ItemType.INGREDIENT, null, unit, null, null));
    }

    @Test
    void 모두_이_매장_품목이면_통과한다() {
        assertThatCode(() -> inventoryItemService.validateSameStore(storeId, List.of(milkId, beanId))).doesNotThrowAnyException();
        assertThatCode(() -> inventoryItemService.validateSameStore(storeId, List.of(milkId, milkId))).doesNotThrowAnyException();
        assertThatCode(() -> inventoryItemService.validateSameStore(storeId, List.of())).doesNotThrowAnyException();
    }

    @Test
    void 하나라도_없거나_다른_매장_품목이면_400() {
        assertThatThrownBy(() -> inventoryItemService.validateSameStore(storeId, List.of(milkId, otherStoreItemId)))
                .isInstanceOfSatisfying(ResponseStatusException.class, e -> assertThat(e.getStatusCode().value()).isEqualTo(400))
                .hasMessageContaining(String.valueOf(otherStoreItemId));
        assertThatThrownBy(() -> inventoryItemService.validateSameStore(storeId, List.of(milkId, 999_999_999L)))
                .isInstanceOfSatisfying(ResponseStatusException.class, e -> assertThat(e.getStatusCode().value()).isEqualTo(400));
    }

    @Test
    void 사용중지_품목도_이_매장_것이면_통과한다() {
        InventoryItem stopped = inventoryItemRepository.findById(beanId).orElseThrow();
        stopped.deactivate();
        inventoryItemRepository.save(stopped);
        assertThatCode(() -> inventoryItemService.validateSameStore(storeId, List.of(beanId))).doesNotThrowAnyException();
    }

    @Test
    void 여러_품목을_id로_가져오고_없거나_다른_매장_것은_뺀다() {
        Map<Long, InventoryItemResponse> items = inventoryItemService.getItemsByIds(storeId,
                Arrays.asList(milkId, beanId, milkId, otherStoreItemId, 999_999_999L, null));

        assertThat(items).containsOnlyKeys(milkId, beanId);
        assertThat(items.get(milkId).name()).isEqualTo("우유");
        assertThat(items.get(milkId).unit()).isEqualTo(ItemUnit.ML);
        assertThat(items.get(beanId).unit()).isEqualTo(ItemUnit.G);
        assertThat(inventoryItemService.getItemsByIds(storeId, List.of())).isEmpty();
    }
}
