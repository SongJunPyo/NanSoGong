package com.nansogong.service;

import com.nansogong.TestcontainersConfig;
import com.nansogong.dto.ResolvedMenu;
import com.nansogong.model.Integration;
import com.nansogong.model.IntegrationProvider;
import com.nansogong.model.Member;
import com.nansogong.model.Menu;
import com.nansogong.model.MenuSource;
import com.nansogong.model.PosMappingStatus;
import com.nansogong.model.PosMenuMapping;
import com.nansogong.model.Store;
import com.nansogong.repository.IntegrationRepository;
import com.nansogong.repository.MemberRepository;
import com.nansogong.repository.MenuRepository;
import com.nansogong.repository.PosMenuMappingRepository;
import com.nansogong.repository.StoreRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * MenuService.resolve 흐름: POS 코드 → 앱 메뉴 번호.
 * 매 테스트는 @Transactional 이라 끝나면 넣은 데이터가 지워진다.
 */
@SpringBootTest
@Import(TestcontainersConfig.class)
@Transactional
class MenuResolveTest {

    @Autowired MenuService menuService;
    @Autowired MemberRepository memberRepository;
    @Autowired StoreRepository storeRepository;
    @Autowired IntegrationRepository integrationRepository;
    @Autowired MenuRepository menuRepository;
    @Autowired PosMenuMappingRepository mappingRepository;

    Long storeId;
    Long americanoId;
    Long shotId;

    @BeforeEach
    void setUp() {
        Member member = memberRepository.save(Member.create("resolve-test", "hash", "테스트", "010-0000-0000"));
        Store store = storeRepository.save(Store.create(member.getId(), "1230000099", "테스트카페", "홍길동", LocalDate.of(2023, 1, 1)));
        Integration pos = integrationRepository.save(Integration.connect(store.getId(), IntegrationProvider.TOSS_PLACE, "TP-TEST", "test/ref"));
        storeId = store.getId();

        Menu americano = menuRepository.save(Menu.create(storeId, "아이스 아메리카노", "커피", new BigDecimal("4500"), MenuSource.POS));
        Menu shot = menuRepository.save(Menu.createOption(storeId, americano.getId(), "샷 추가", new BigDecimal("500"), MenuSource.POS));
        americanoId = americano.getId();
        shotId = shot.getId();

        // M102 = 아이스 아메리카노, M102+O101 = 그 메뉴의 샷 추가, M102+O900 = 얼음 적게(제외)
        PosMenuMapping menuMap = PosMenuMapping.unmapped(storeId, pos.getId(), "M102", "", "아이스 아메리카노");
        menuMap.mapTo(americanoId);
        PosMenuMapping shotMap = PosMenuMapping.unmapped(storeId, pos.getId(), "M102", "O101", "샷 추가");
        shotMap.mapTo(shotId);
        PosMenuMapping lessIce = PosMenuMapping.unmapped(storeId, pos.getId(), "M102", "O900", "얼음 적게");
        lessIce.exclude();
        mappingRepository.saveAll(List.of(menuMap, shotMap, lessIce));
    }

    @Test
    void 메뉴와_옵션을_모두_찾으면_complete() {
        ResolvedMenu result = menuService.resolve(storeId, "M102", List.of("O101"));

        assertThat(result.menuId()).isEqualTo(americanoId);
        assertThat(result.status()).isEqualTo(PosMappingStatus.MAPPED);
        assertThat(result.options()).singleElement().satisfies(o -> {
            assertThat(o.menuId()).isEqualTo(shotId);
            assertThat(o.status()).isEqualTo(PosMappingStatus.MAPPED);
        });
        assertThat(result.complete()).isTrue();
    }

    @Test
    void 제외된_옵션은_menuId_없이도_complete() {
        ResolvedMenu result = menuService.resolve(storeId, "M102", List.of("O101", "O900"));

        assertThat(result.options()).extracting(ResolvedMenu.ResolvedOption::status)
                .containsExactly(PosMappingStatus.MAPPED, PosMappingStatus.EXCLUDED);
        assertThat(result.options().get(1).menuId()).isNull();
        assertThat(result.complete()).isTrue();
    }

    @Test
    void 연결_안_된_옵션이_있으면_incomplete() {
        ResolvedMenu result = menuService.resolve(storeId, "M102", List.of("O101", "O105"));

        assertThat(result.menuId()).isEqualTo(americanoId);
        assertThat(result.options().get(1).menuId()).isNull();
        assertThat(result.options().get(1).status()).isEqualTo(PosMappingStatus.UNMAPPED);
        assertThat(result.complete()).isFalse();
    }

    @Test
    void 모르는_메뉴_코드면_menuId_null() {
        ResolvedMenu result = menuService.resolve(storeId, "M999", List.of());

        assertThat(result.menuId()).isNull();
        assertThat(result.status()).isEqualTo(PosMappingStatus.UNMAPPED);
        assertThat(result.complete()).isFalse();
    }

    @Test
    void 옵션_코드가_같아도_메뉴가_다르면_다른_옵션() {
        // 다른 메뉴(M101)의 O101 은 연결해 두지 않았으므로, M102 의 샷 추가가 잘못 나오면 안 된다
        ResolvedMenu result = menuService.resolve(storeId, "M101", List.of("O101"));

        assertThat(result.options().get(0).menuId()).isNull();
        assertThat(result.options().get(0).status()).isEqualTo(PosMappingStatus.UNMAPPED);
    }
}
