package com.nansogong.service;

import com.nansogong.TestcontainersConfig;
import com.nansogong.dto.RecipeResponse;
import com.nansogong.dto.RecipeSaveRequest;
import com.nansogong.dto.RecipeSaveRequest.Line;
import com.nansogong.model.Member;
import com.nansogong.model.Menu;
import com.nansogong.model.MenuSource;
import com.nansogong.model.RecipeAppliesTo;
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
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** 레시피 저장 흐름: 통째로 교체 · 기존 행은 닫힘 · 잘못된 입력은 400 */
@SpringBootTest
@Import(TestcontainersConfig.class)
@Transactional
class RecipeSaveTest {

    @Autowired RecipeService recipeService;
    @Autowired MemberRepository memberRepository;
    @Autowired StoreRepository storeRepository;
    @Autowired MenuRepository menuRepository;
    @Autowired RecipeItemRepository recipeItemRepository;
    @Autowired JdbcTemplate jdbc;

    Long memberId, storeId, menuId, optionId;
    Long beanId, milkId, otherStoreItemId;

    @BeforeEach
    void setUp() {
        Member owner = memberRepository.save(Member.create("recipe-save", "hash", "사장", "010-0000-0000"));
        Member other = memberRepository.save(Member.create("recipe-other", "hash", "남", "010-0000-0001"));
        memberId = owner.getId();
        storeId = storeRepository.save(Store.create(memberId, "1230000097", "내카페", "사장", LocalDate.of(2023, 1, 1))).getId();
        Long otherStoreId = storeRepository.save(Store.create(other.getId(), "1230000096", "남의카페", "남", LocalDate.of(2023, 1, 1))).getId();

        beanId = item(storeId, "원두", "G");
        milkId = item(storeId, "우유", "ML");
        otherStoreItemId = item(otherStoreId, "남의 원두", "G");

        menuId = menuRepository.save(Menu.create(storeId, "카페라떼", "커피", new BigDecimal("5000"), MenuSource.MANUAL)).getId();
        optionId = menuRepository.save(Menu.createOption(storeId, menuId, "디카페인 변경", new BigDecimal("500"), MenuSource.MANUAL)).getId();
    }

    @Test
    void 저장하면_지금_레시피가_되고_품목_이름_단위가_나온다() {
        RecipeResponse saved = recipeService.saveRecipe(memberId, storeId, menuId, request(
                new Line(beanId, new BigDecimal("18"), null),
                new Line(milkId, new BigDecimal("200"), RecipeAppliesTo.ALL)));

        RecipeResponse now = recipeService.getRecipe(memberId, storeId, menuId);
        assertThat(now.items()).hasSize(2);
        assertThat(now.items()).extracting(RecipeResponse.Line::itemName).containsExactlyInAnyOrder("원두", "우유");
        assertThat(saved.items().get(0).appliesTo()).isEqualTo(RecipeAppliesTo.ALL);   // 안 보내면 ALL
    }

    @Test
    void 다시_저장하면_기존_행은_닫히고_지난_시각은_옛_레시피로_계산() {
        RecipeResponse first = recipeService.saveRecipe(memberId, storeId, menuId, request(new Line(beanId, new BigDecimal("18"), null)));
        Instant firstAt = first.items().get(0).validFrom();
        recipeService.saveRecipe(memberId, storeId, menuId, request(new Line(beanId, new BigDecimal("20"), null)));

        assertThat(recipeItemRepository.findByMenuIdAndValidToIsNull(menuId)).singleElement()
                .satisfies(r -> assertThat(r.getQuantity()).isEqualByComparingTo("20"));
        assertThat(recipeService.usageOf(menuId, List.of(), firstAt).get(beanId)).isEqualByComparingTo("18");
        assertThat(recipeService.usageOf(menuId, List.of(), Instant.now()).get(beanId)).isEqualByComparingTo("20");
    }

    @Test
    void 남의_매장_품목은_404() {
        assertStatus(() -> recipeService.saveRecipe(memberId, storeId, menuId, request(new Line(otherStoreItemId, BigDecimal.ONE, null))),
                HttpStatus.NOT_FOUND);
    }

    @Test
    void 사용_중지된_품목은_400() {
        jdbc.update("UPDATE item SET is_active = false WHERE item_id = ?", milkId);
        assertStatus(() -> recipeService.saveRecipe(memberId, storeId, menuId, request(new Line(milkId, BigDecimal.TEN, null))),
                HttpStatus.BAD_REQUEST);
    }

    @Test
    void 같은_품목_두_번은_400() {
        assertStatus(() -> recipeService.saveRecipe(memberId, storeId, menuId, request(
                new Line(beanId, BigDecimal.ONE, null), new Line(beanId, BigDecimal.TEN, null))), HttpStatus.BAD_REQUEST);
    }

    @Test
    void 기본_메뉴는_0_이하_400_옵션은_음수_허용() {
        assertStatus(() -> recipeService.saveRecipe(memberId, storeId, menuId, request(new Line(beanId, BigDecimal.ZERO, null))),
                HttpStatus.BAD_REQUEST);

        RecipeResponse option = recipeService.saveRecipe(memberId, storeId, optionId, request(new Line(beanId, new BigDecimal("-18"), null)));
        assertThat(option.items().get(0).quantity()).isEqualByComparingTo("-18");
    }

    @Test
    void 남의_매장이면_403() {
        Member stranger = memberRepository.save(Member.create("recipe-stranger", "hash", "모름", "010-0000-0002"));
        assertStatus(() -> recipeService.getRecipe(stranger.getId(), storeId, menuId), HttpStatus.FORBIDDEN);
    }

    // ---- 도우미 ----

    private RecipeSaveRequest request(Line... lines) {
        return new RecipeSaveRequest(List.of(lines));
    }

    private Long item(Long store, String name, String unit) {
        return jdbc.queryForObject(
                "INSERT INTO item (store_id, name, item_type, unit) VALUES (?, ?, 'INGREDIENT', ?) RETURNING item_id",
                Long.class, store, name, unit);
    }

    private void assertStatus(Runnable call, HttpStatus status) {
        assertThatThrownBy(call::run)
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(e -> assertThat(((ResponseStatusException) e).getStatusCode()).isEqualTo(status));
    }
}
