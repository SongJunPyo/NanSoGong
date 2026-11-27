package com.nansogong.service;

import com.nansogong.TestcontainersConfig;
import com.nansogong.dto.MenuOptionRequest;
import com.nansogong.dto.MenuOptionResponse;
import com.nansogong.dto.MenuRequest;
import com.nansogong.model.Member;
import com.nansogong.model.Menu;
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

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** 옵션 수정: 0원 옵션도 고칠 수 있고, 메뉴 수정 경로로는 옵션을 바꾸지 않는다 */
@SpringBootTest
@Import(TestcontainersConfig.class)
@Transactional
class MenuOptionUpdateTest {

    @Autowired MenuService menuService;
    @Autowired MemberRepository memberRepository;
    @Autowired StoreRepository storeRepository;
    @Autowired MenuRepository menuRepository;

    Long memberId, storeId, americanoId, latteId, shotId;

    @BeforeEach
    void setUp() {
        memberId = memberRepository.save(Member.create("option-owner", "hash", "사장", "010-0000-0002")).getId();
        storeId = storeRepository.save(Store.create(memberId, "1230000098", "옵션카페", "사장", LocalDate.of(2023, 1, 1))).getId();
        americanoId = menuRepository.save(Menu.create(storeId, "아메리카노", "커피", new BigDecimal("4000"), MenuSource.MANUAL)).getId();
        latteId = menuRepository.save(Menu.create(storeId, "카페라떼", "커피", new BigDecimal("4500"), MenuSource.MANUAL)).getId();
        shotId = menuRepository.save(Menu.createOption(storeId, americanoId, "샷 추가", new BigDecimal("500"), MenuSource.MANUAL)).getId();
    }

    @Test
    void 옵션을_0원으로_고칠_수_있다() {
        MenuOptionResponse response = menuService.updateOption(memberId, storeId, americanoId, shotId,
                new MenuOptionRequest("얼음 적게", BigDecimal.ZERO));

        assertThat(response.name()).isEqualTo("얼음 적게");
        assertThat(response.price()).isEqualByComparingTo("0");
        Menu saved = menuRepository.findById(shotId).orElseThrow();
        assertThat(saved.getName()).isEqualTo("얼음 적게");
        assertThat(saved.getPrice()).isEqualByComparingTo("0");
        assertThat(saved.getParentMenuId()).isEqualTo(americanoId);   // 붙은 메뉴는 그대로
    }

    @Test
    void 다른_메뉴의_옵션_번호면_404_그대로() {
        assertNotFound(() -> menuService.updateOption(memberId, storeId, latteId, shotId,
                new MenuOptionRequest("바뀐옵션", BigDecimal.ZERO)));
        assertThat(menuRepository.findById(shotId).orElseThrow().getName()).isEqualTo("샷 추가");
    }

    @Test
    void 기본_메뉴_번호를_옵션으로_고치면_404() {
        assertNotFound(() -> menuService.updateOption(memberId, storeId, americanoId, latteId,
                new MenuOptionRequest("바뀐옵션", BigDecimal.ZERO)));
        assertThat(menuRepository.findById(latteId).orElseThrow().getName()).isEqualTo("카페라떼");
    }

    @Test
    void 메뉴_수정으로_옵션을_고치면_400_그대로() {
        assertThatThrownBy(() -> menuService.updateMenu(memberId, storeId, shotId,
                new MenuRequest("샷 두 번", "커피", new BigDecimal("1000"), "톨")))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(e -> assertThat(((ResponseStatusException) e).getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST));
        Menu option = menuRepository.findById(shotId).orElseThrow();
        assertThat(option.getName()).isEqualTo("샷 추가");
        assertThat(option.getCategory()).isNull();
        assertThat(option.getSpec()).isNull();
    }

    private void assertNotFound(Runnable call) {
        assertThatThrownBy(call::run)
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(e -> assertThat(((ResponseStatusException) e).getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND));
    }
}
