package com.nansogong.service;

import com.nansogong.TestcontainersConfig;
import com.nansogong.dto.OptionQty;
import com.nansogong.model.Member;
import com.nansogong.model.Menu;
import com.nansogong.model.MenuSource;
import com.nansogong.model.RecipeAppliesTo;
import com.nansogong.model.RecipeItem;
import com.nansogong.model.RecipeSource;
import com.nansogong.model.Store;
import com.nansogong.repository.MemberRepository;
import com.nansogong.repository.MenuRepository;
import com.nansogong.repository.RecipeItemRepository;
import com.nansogong.repository.StoreRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * RecipeService.usageOf 흐름: 메뉴 1개 + 옵션 → 품목별 사용량.
 * 품목 엔티티(준표)가 아직 없어서 item 행은 SQL 로 직접 넣는다.
 */
@SpringBootTest
@Import(TestcontainersConfig.class)
@Transactional
class RecipeUsageTest {

    @Autowired RecipeService recipeService;
    @Autowired MemberRepository memberRepository;
    @Autowired StoreRepository storeRepository;
    @Autowired MenuRepository menuRepository;
    @Autowired RecipeItemRepository recipeItemRepository;
    @Autowired JdbcTemplate jdbc;

    static final Instant START = Instant.parse("2025-01-01T00:00:00Z");
    final Instant now = Instant.now().truncatedTo(ChronoUnit.SECONDS);

    Long storeId, americanoId, shotId, decafId;
    Long beanId, decafBeanId, cupId;

    @BeforeEach
    void setUp() {
        Member member = memberRepository.save(Member.create("usage-test", "hash", "테스트", "010-0000-0000"));
        storeId = storeRepository.save(Store.create(member.getId(), "1230000098", "테스트카페", "홍길동", LocalDate.of(2023, 1, 1))).getId();

        beanId = item("원두", "G");
        decafBeanId = item("디카페인 원두", "G");
        cupId = item("ICE컵", "EA");

        americanoId = menuRepository.save(Menu.create(storeId, "아이스 아메리카노", "커피", new BigDecimal("4500"), MenuSource.POS)).getId();
        shotId = menuRepository.save(Menu.createOption(storeId, americanoId, "샷 추가", new BigDecimal("500"), MenuSource.POS)).getId();
        decafId = menuRepository.save(Menu.createOption(storeId, americanoId, "디카페인 변경", new BigDecimal("500"), MenuSource.POS)).getId();

        recipe(americanoId, beanId, "18", RecipeAppliesTo.ALL, START);
        recipe(americanoId, cupId, "1", RecipeAppliesTo.TAKEOUT_DELIVERY, START);   // 포장 때만 → 지금은 계산에서 빠져야 함
        recipe(shotId, beanId, "9", RecipeAppliesTo.ALL, START);
        recipe(decafId, beanId, "-18", RecipeAppliesTo.ALL, START);
        recipe(decafId, decafBeanId, "18", RecipeAppliesTo.ALL, START);
    }

    @Test
    void 기본_메뉴만() {
        Map<Long, BigDecimal> usage = recipeService.usageOf(americanoId, List.of(), now);

        assertThat(usage).containsOnlyKeys(beanId);
        assertThat(usage.get(beanId)).isEqualByComparingTo("18");
    }

    @Test
    void 샷_추가_1개면_원두_27g() {
        Map<Long, BigDecimal> usage = recipeService.usageOf(americanoId, List.of(new OptionQty(shotId, 1)), now);

        assertThat(usage.get(beanId)).isEqualByComparingTo("27");
    }

    @Test
    void 샷_추가_2개면_원두_36g() {
        Map<Long, BigDecimal> usage = recipeService.usageOf(americanoId, List.of(new OptionQty(shotId, 2)), now);

        assertThat(usage.get(beanId)).isEqualByComparingTo("36");
    }

    @Test
    void 디카페인_변경은_원두_대신_디카페인_원두() {
        Map<Long, BigDecimal> usage = recipeService.usageOf(americanoId, List.of(new OptionQty(decafId, 1)), now);

        assertThat(usage).containsOnlyKeys(decafBeanId);   // 원두 18 - 18 = 0 → 빠짐
        assertThat(usage.get(decafBeanId)).isEqualByComparingTo("18");
    }

    @Test
    void 제외된_옵션은_사용량_0() {
        Map<Long, BigDecimal> usage = recipeService.usageOf(americanoId, List.of(new OptionQty(null, 1)), now);

        assertThat(usage.get(beanId)).isEqualByComparingTo("18");
    }

    @Test
    void 레시피가_바뀌면_판매_시각의_레시피로_계산() {
        Instant changedAt = Instant.parse("2026-01-01T00:00:00Z");
        RecipeItem old = recipeItemRepository.findByMenuIdAndValidToIsNull(americanoId).stream()
                .filter(r -> r.getItemId().equals(beanId)).findFirst().orElseThrow();
        old.close(changedAt);                                    // 기존 18g 은 2026-01-01 부로 끝
        recipe(americanoId, beanId, "20", RecipeAppliesTo.ALL, changedAt);   // 새 레시피 20g

        assertThat(recipeService.usageOf(americanoId, List.of(), Instant.parse("2025-06-01T00:00:00Z")).get(beanId))
                .isEqualByComparingTo("18");
        assertThat(recipeService.usageOf(americanoId, List.of(), now).get(beanId))
                .isEqualByComparingTo("20");
    }

    @Test
    void 레시피가_없으면_빈_결과() {
        Long noRecipe = menuRepository.save(Menu.create(storeId, "신메뉴", "커피", new BigDecimal("5000"), MenuSource.MANUAL)).getId();

        assertThat(recipeService.usageOf(noRecipe, List.of(), now)).isEmpty();
    }

    // ---- 도우미 ----

    private Long item(String name, String unit) {
        return jdbc.queryForObject(
                "INSERT INTO item (store_id, name, item_type, unit) VALUES (?, ?, 'INGREDIENT', ?) RETURNING item_id",
                Long.class, storeId, name, unit);
    }

    private void recipe(Long menuId, Long itemId, String qty, RecipeAppliesTo appliesTo, Instant from) {
        recipeItemRepository.saveAndFlush(RecipeItem.create(storeId, menuId, itemId, new BigDecimal(qty), appliesTo, RecipeSource.OWNER, from));
    }
}
