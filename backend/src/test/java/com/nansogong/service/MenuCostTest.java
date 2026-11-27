package com.nansogong.service;

import com.nansogong.TestcontainersConfig;
import com.nansogong.dto.MenuCostResponse;
import com.nansogong.dto.MenuCostResponse.Status;
import com.nansogong.model.ItemCost;
import com.nansogong.model.ItemCostSource;
import com.nansogong.model.Member;
import com.nansogong.model.Menu;
import com.nansogong.model.MenuSource;
import com.nansogong.model.RecipeAppliesTo;
import com.nansogong.model.RecipeItem;
import com.nansogong.model.RecipeSource;
import com.nansogong.model.Store;
import com.nansogong.repository.ItemCostRepository;
import com.nansogong.repository.MemberRepository;
import com.nansogong.repository.MenuRepository;
import com.nansogong.repository.RecipeItemRepository;
import com.nansogong.repository.StoreRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** 메뉴 원가 흐름: 레시피 × 그 시점 단가, 단가 없으면 MISSING_COST */
@SpringBootTest
@Import(TestcontainersConfig.class)
@Transactional
class MenuCostTest {

    @Autowired MenuCostService menuCostService;
    @Autowired MemberRepository memberRepository;
    @Autowired StoreRepository storeRepository;
    @Autowired MenuRepository menuRepository;
    @Autowired RecipeItemRepository recipeItemRepository;
    @Autowired ItemCostRepository itemCostRepository;
    @Autowired JdbcTemplate jdbc;

    static final Instant START = Instant.parse("2024-01-01T00:00:00Z");
    static final Instant RAISED = Instant.parse("2025-07-01T00:00:00Z");   // 원두 단가 인상

    Long memberId, storeId, americanoId, beanId, cupId;

    @BeforeEach
    void setUp() {
        memberId = memberRepository.save(Member.create("cost-test", "hash", "사장", "010-0000-0000")).getId();
        storeId = storeRepository.save(Store.create(memberId, "1230000095", "원가카페", "사장", LocalDate.of(2023, 1, 1))).getId();
        beanId = item("원두", "G");
        cupId = item("ICE컵", "EA");

        americanoId = menuRepository.save(Menu.create(storeId, "아이스 아메리카노", "커피", new BigDecimal("4500"), MenuSource.POS)).getId();
        recipe(americanoId, beanId, "18");
        recipe(americanoId, cupId, "1");

        cost(beanId, "30", START);
        cost(beanId, "34", RAISED);
        cost(cupId, "160", START);
    }

    @Test
    void 지금_원가는_인상된_단가로_계산() {
        MenuCostResponse r = menuCostService.getCost(memberId, storeId, americanoId, null);

        // 원두 18g × 34원 = 612 + 컵 1 × 160 = 772
        assertThat(r.status()).isEqualTo(Status.COMPLETE);
        assertThat(r.cost()).isEqualByComparingTo("772");
        assertThat(r.costRate()).isEqualByComparingTo("17.2");      // 772 / 4500 = 17.16%
        assertThat(r.grossProfit()).isEqualByComparingTo("3728");
        assertThat(r.lines()).hasSize(2);
    }

    @Test
    void 인상_전_시점은_그때_단가로_계산() {
        MenuCostResponse r = menuCostService.getCost(memberId, storeId, americanoId, Instant.parse("2025-01-01T00:00:00Z"));

        // 원두 18g × 30원 = 540 + 160 = 700
        assertThat(r.cost()).isEqualByComparingTo("700");
    }

    @Test
    void 단가_없는_품목이_있으면_원가를_만들지_않는다() {
        Long syrupId = item("바닐라시럽", "ML");
        recipe(americanoId, syrupId, "20");

        MenuCostResponse r = menuCostService.getCost(memberId, storeId, americanoId, null);

        assertThat(r.status()).isEqualTo(Status.MISSING_COST);
        assertThat(r.cost()).isNull();
        assertThat(r.costRate()).isNull();
        assertThat(r.missingCostItemIds()).containsExactly(syrupId);
    }

    @Test
    void 레시피가_없으면_NO_RECIPE() {
        Long newMenu = menuRepository.save(Menu.create(storeId, "신메뉴", "커피", new BigDecimal("5000"), MenuSource.MANUAL)).getId();

        assertThat(menuCostService.getCost(memberId, storeId, newMenu, null).status()).isEqualTo(Status.NO_RECIPE);
    }

    @Test
    void 남의_매장이면_403() {
        Long stranger = memberRepository.save(Member.create("cost-stranger", "hash", "남", "010-0000-0001")).getId();

        assertThatThrownBy(() -> menuCostService.getCost(stranger, storeId, americanoId, null))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(e -> assertThat(((ResponseStatusException) e).getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN));
    }

    @Test
    void 판매가_0원_메뉴는_원가율만_null() {
        Long free = menuRepository.save(Menu.create(storeId, "시음 샘플", "커피", BigDecimal.ZERO, MenuSource.POS)).getId();
        recipe(free, beanId, "18");

        MenuCostResponse r = menuCostService.getCost(memberId, storeId, free, null);

        assertThat(r.status()).isEqualTo(Status.COMPLETE);
        assertThat(r.cost()).isEqualByComparingTo("612");          // 18g × 34원
        assertThat(r.costRate()).isNull();                          // 0 으로 나누지 않음
        assertThat(r.grossProfit()).isEqualByComparingTo("-612");
    }

    @Test
    void 레시피를_바꾸면_바꾸기_전_시점은_옛_레시피로_계산() {
        Instant changed = Instant.parse("2025-03-01T00:00:00Z");
        recipeItemRepository.findByMenuIdAndValidToIsNull(americanoId).stream()
                .filter(r -> r.getItemId().equals(beanId)).findFirst().orElseThrow()
                .close(changed);                                      // 원두 18g 은 3/1 부로 끝
        recipe(americanoId, beanId, "20", changed, RecipeAppliesTo.ALL);   // 3/1 부터 20g

        // 2025-02: 18g × 30원 + 160 = 700 / 지금: 20g × 34원 + 160 = 840
        assertThat(menuCostService.getCost(memberId, storeId, americanoId, Instant.parse("2025-02-01T00:00:00Z")).cost())
                .isEqualByComparingTo("700");
        assertThat(menuCostService.getCost(memberId, storeId, americanoId, null).cost())
                .isEqualByComparingTo("840");
    }

    @Test
    void 미래부터_적용되는_단가는_아직_쓰지_않는다() {
        Instant nextMonth = Instant.now().plus(30, ChronoUnit.DAYS);
        cost(cupId, "200", nextMonth);                                // 컵 단가 인상 예정
        Long lidId = item("뚜껑", "EA");
        recipe(americanoId, lidId, "1");
        cost(lidId, "40", nextMonth);                                 // 뚜껑은 미래 단가만 있음

        MenuCostResponse r = menuCostService.getCost(memberId, storeId, americanoId, null);

        assertThat(r.status()).isEqualTo(Status.MISSING_COST);       // 지금 기준 뚜껑 단가 없음
        assertThat(r.missingCostItemIds()).containsExactly(lidId);
        assertThat(r.lines()).filteredOn(l -> l.itemId().equals(cupId)).singleElement()
                .satisfies(l -> assertThat(l.unitCost()).isEqualByComparingTo("160"));   // 컵은 아직 160원
    }

    @Test
    void 소수_단가는_원_단위_둘째_자리에서_반올림() {
        Long milkId = item("우유", "ML");
        Long powderId = item("향료", "G");
        Long latteId = menuRepository.save(Menu.create(storeId, "카페라떼", "커피", new BigDecimal("5000"), MenuSource.POS)).getId();
        recipe(latteId, milkId, "200");
        recipe(latteId, powderId, "18");
        cost(milkId, "2.8", START);                                   // 200 × 2.8 = 560
        cost(powderId, "0.0125", START);                              // 18 × 0.0125 = 0.225

        MenuCostResponse r = menuCostService.getCost(memberId, storeId, latteId, null);

        assertThat(r.cost()).isEqualByComparingTo("560.23");          // 560.225 → 560.23
        assertThat(r.lines()).filteredOn(l -> l.itemId().equals(milkId)).singleElement()
                .satisfies(l -> assertThat(l.lineCost()).isEqualByComparingTo("560.00"));
        assertThat(r.costRate()).isEqualByComparingTo("11.2");        // 560.23 / 5000 = 11.20%
    }

    @Test
    void 다른_매장_메뉴_번호면_404() {
        Long otherOwner = memberRepository.save(Member.create("cost-other", "hash", "남", "010-0000-0002")).getId();
        Long otherStore = storeRepository.save(Store.create(otherOwner, "1230000094", "남의카페", "남", LocalDate.of(2023, 1, 1))).getId();
        Long otherMenu = menuRepository.save(Menu.create(otherStore, "남의 메뉴", "커피", new BigDecimal("3000"), MenuSource.POS)).getId();

        assertThatThrownBy(() -> menuCostService.getCost(memberId, storeId, otherMenu, null))   // 내 매장 주소 + 남의 메뉴
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(e -> assertThat(((ResponseStatusException) e).getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND));
    }

    @Test
    void 포장_전용_재료는_지금은_원가에서_빠진다() {
        // usageOf 와 같은 기준: 주문 유형(매장/포장)을 받기 전까지 applies_to = ALL 만 계산
        Long holderId = item("컵홀더", "EA");
        recipe(americanoId, holderId, "1", START, RecipeAppliesTo.TAKEOUT_DELIVERY);
        cost(holderId, "50", START);

        MenuCostResponse r = menuCostService.getCost(memberId, storeId, americanoId, null);

        assertThat(r.cost()).isEqualByComparingTo("772");             // 컵홀더 50원 안 더해짐
        assertThat(r.lines()).extracting(MenuCostResponse.Line::itemId).doesNotContain(holderId);
    }

    // ---- 도우미 ----

    private Long item(String name, String unit) {
        return jdbc.queryForObject(
                "INSERT INTO item (store_id, name, item_type, unit) VALUES (?, ?, 'INGREDIENT', ?) RETURNING item_id",
                Long.class, storeId, name, unit);
    }

    private void recipe(Long menuId, Long itemId, String qty) {
        recipe(menuId, itemId, qty, START, RecipeAppliesTo.ALL);
    }

    private void recipe(Long menuId, Long itemId, String qty, Instant from, RecipeAppliesTo appliesTo) {
        recipeItemRepository.saveAndFlush(RecipeItem.create(storeId, menuId, itemId, new BigDecimal(qty),
                appliesTo, RecipeSource.OWNER, from));
    }

    private void cost(Long itemId, String unitCost, Instant from) {
        itemCostRepository.saveAndFlush(ItemCost.create(storeId, itemId, new BigDecimal(unitCost), from, ItemCostSource.MANUAL, null));
    }
}
