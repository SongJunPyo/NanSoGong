package com.nansogong.service;

import com.nansogong.TestcontainersConfig;
import com.nansogong.dto.MenuOptionRequest;
import com.nansogong.dto.MenuRequest;
import com.nansogong.dto.RecipeSaveRequest;
import com.nansogong.model.Member;
import com.nansogong.model.Menu;
import com.nansogong.model.MenuSaleStatus;
import com.nansogong.model.MenuSource;
import com.nansogong.model.Store;
import com.nansogong.repository.MemberRepository;
import com.nansogong.repository.MenuRepository;
import com.nansogong.repository.StoreRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** 남의 매장 메뉴 · 레시피 · 원가 API 는 전부 403 이고, 아무것도 바뀌지 않는다 */
@SpringBootTest
@Import(TestcontainersConfig.class)
@Transactional
class MenuOwnerTest {

    @Autowired MenuService menuService;
    @Autowired RecipeService recipeService;
    @Autowired MenuCostService menuCostService;
    @Autowired MemberRepository memberRepository;
    @Autowired StoreRepository storeRepository;
    @Autowired MenuRepository menuRepository;

    Long intruderId, otherStoreId, otherMenuId;

    @BeforeEach
    void setUp() {
        Member owner = memberRepository.save(Member.create("owner-test", "hash", "사장", "010-0000-0000"));
        intruderId = memberRepository.save(Member.create("intruder-test", "hash", "남", "010-0000-0001")).getId();
        // intruder 도 자기 매장이 하나 있다 (매장이 없는 사람만 막히는 게 아님을 확인)
        storeRepository.save(Store.create(intruderId, "1230000096", "내카페", "남", LocalDate.of(2023, 1, 1)));
        otherStoreId = storeRepository.save(Store.create(owner.getId(), "1230000097", "남의카페", "사장", LocalDate.of(2023, 1, 1))).getId();
        otherMenuId = menuRepository.save(Menu.create(otherStoreId, "아메리카노", "커피", new BigDecimal("4000"), MenuSource.MANUAL)).getId();
    }

    @Test
    void 메뉴_목록_조회() {
        assertForbidden(() -> menuService.getMenus(intruderId, otherStoreId));
    }

    @Test
    void 메뉴_하나_조회() {
        assertForbidden(() -> menuService.getMenu(intruderId, otherStoreId, otherMenuId));
    }

    @Test
    void 메뉴_등록_안되고_메뉴_수도_그대로() {
        long before = menuRepository.count();
        assertForbidden(() -> menuService.createMenu(intruderId, otherStoreId,
                new MenuRequest("몰래메뉴", "커피", new BigDecimal("1000"), null)));
        assertThat(menuRepository.count()).isEqualTo(before);
    }

    @Test
    void 메뉴_수정_안되고_이름_가격_그대로() {
        assertForbidden(() -> menuService.updateMenu(intruderId, otherStoreId, otherMenuId,
                new MenuRequest("바뀐이름", "커피", new BigDecimal("1"), null)));
        Menu menu = menuRepository.findById(otherMenuId).orElseThrow();
        assertThat(menu.getName()).isEqualTo("아메리카노");
        assertThat(menu.getPrice()).isEqualByComparingTo("4000");
    }

    @Test
    void 판매_상태_변경_안됨() {
        assertForbidden(() -> menuService.changeSaleStatus(intruderId, otherStoreId, otherMenuId, MenuSaleStatus.SOLD_OUT));
        assertThat(menuRepository.findById(otherMenuId).orElseThrow().getSaleStatus()).isEqualTo(MenuSaleStatus.ON_SALE);
    }

    @Test
    void 옵션_등록() {
        assertForbidden(() -> menuService.createOption(intruderId, otherStoreId, otherMenuId,
                new MenuOptionRequest("샷 추가", new BigDecimal("500"))));
    }

    @Test
    void 옵션_수정_안되고_그대로() {
        Long optionId = menuRepository.save(Menu.createOption(otherStoreId, otherMenuId, "샷 추가", new BigDecimal("500"), MenuSource.MANUAL)).getId();
        assertForbidden(() -> menuService.updateOption(intruderId, otherStoreId, otherMenuId, optionId,
                new MenuOptionRequest("몰래옵션", BigDecimal.ZERO)));
        Menu option = menuRepository.findById(optionId).orElseThrow();
        assertThat(option.getName()).isEqualTo("샷 추가");
        assertThat(option.getPrice()).isEqualByComparingTo("500");
    }

    @Test
    void 레시피_조회_저장() {
        assertForbidden(() -> recipeService.getRecipe(intruderId, otherStoreId, otherMenuId));
        assertForbidden(() -> recipeService.saveRecipe(intruderId, otherStoreId, otherMenuId, new RecipeSaveRequest(List.of())));
    }

    @Test
    void 원가_조회() {
        assertForbidden(() -> menuCostService.getCost(intruderId, otherStoreId, otherMenuId, null));
    }

    private void assertForbidden(Runnable call) {
        assertThatThrownBy(call::run)
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(e -> assertThat(((ResponseStatusException) e).getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN));
    }
}
