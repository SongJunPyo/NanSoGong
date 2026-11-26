package com.nansogong.service;

import com.nansogong.TestcontainersConfig;
import com.nansogong.dto.RecipeSaveRequest;
import com.nansogong.dto.RecipeSaveRequest.Line;
import com.nansogong.model.Member;
import com.nansogong.model.Menu;
import com.nansogong.model.MenuSource;
import com.nansogong.model.Store;
import com.nansogong.repository.MemberRepository;
import com.nansogong.repository.MenuRepository;
import com.nansogong.repository.StoreRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 같은 메뉴 레시피를 동시에 저장해도 열린 레시피(valid_to 가 비어 있는 행)는 한 벌만 남는다.
 * 스레드마다 트랜잭션이 따로 있어야 해서 클래스에 @Transactional 을 붙이지 않고, 끝나면 직접 지운다.
 */
@SpringBootTest
@Import(TestcontainersConfig.class)
class RecipeConcurrentSaveTest {

    @Autowired RecipeService recipeService;
    @Autowired MemberRepository memberRepository;
    @Autowired StoreRepository storeRepository;
    @Autowired MenuRepository menuRepository;
    @Autowired JdbcTemplate jdbc;

    Long memberId, storeId, menuId, beanId, milkId;

    @BeforeEach
    void setUp() {
        memberId = memberRepository.save(Member.create("recipe-concurrent", "hash", "사장", "010-0000-0000")).getId();
        storeId = storeRepository.save(Store.create(memberId, "1230000097", "동시카페", "사장", LocalDate.of(2023, 1, 1))).getId();
        menuId = menuRepository.save(Menu.create(storeId, "카페라떼", "커피", new BigDecimal("5000"), MenuSource.MANUAL)).getId();
        beanId = item("원두", "G");
        milkId = item("우유", "ML");
    }

    @AfterEach
    void cleanUp() {
        jdbc.update("DELETE FROM recipe_item WHERE store_id = ?", storeId);
        jdbc.update("DELETE FROM menu WHERE store_id = ?", storeId);
        jdbc.update("DELETE FROM item WHERE store_id = ?", storeId);
        jdbc.update("DELETE FROM store WHERE store_id = ?", storeId);
        jdbc.update("DELETE FROM member WHERE member_id = ?", memberId);
    }

    @Test
    void 동시에_저장해도_열린_레시피는_한_벌() throws Exception {
        // 처음 레시피가 있는 상태에서 시작 (닫기 → 새로 넣기 경쟁이 실제로 생기게)
        recipeService.saveRecipe(memberId, storeId, menuId, request(new Line(beanId, new BigDecimal("18"), null)));

        int threads = 5;
        ExecutorService pool = Executors.newFixedThreadPool(threads);
        CountDownLatch ready = new CountDownLatch(threads);
        CountDownLatch go = new CountDownLatch(1);
        List<Future<?>> results = new ArrayList<>();
        for (int i = 0; i < threads; i++) {
            BigDecimal milk = new BigDecimal(200 + i);
            results.add(pool.submit(() -> {
                ready.countDown();
                go.await();
                return recipeService.saveRecipe(memberId, storeId, menuId, request(
                        new Line(beanId, new BigDecimal("18"), null),
                        new Line(milkId, milk, null)));
            }));
        }
        ready.await();
        go.countDown();               // 다섯 개를 한꺼번에 출발
        for (Future<?> r : results) {
            r.get(30, TimeUnit.SECONDS);   // 하나라도 실패하면 여기서 예외
        }
        pool.shutdown();

        Integer open = jdbc.queryForObject(
                "SELECT count(*) FROM recipe_item WHERE menu_id = ? AND valid_to IS NULL", Integer.class, menuId);
        assertThat(open).isEqualTo(2);   // 원두 + 우유 한 벌

        Integer all = jdbc.queryForObject("SELECT count(*) FROM recipe_item WHERE menu_id = ?", Integer.class, menuId);
        assertThat(all).isEqualTo(1 + threads * 2);   // 처음 1행 + 저장 5번 × 2행 (지난 행은 닫혀서 남는다)
    }

    private RecipeSaveRequest request(Line... lines) {
        return new RecipeSaveRequest(List.of(lines));
    }

    private Long item(String name, String unit) {
        return jdbc.queryForObject(
                "INSERT INTO item (store_id, name, item_type, unit) VALUES (?, ?, 'INGREDIENT', ?) RETURNING item_id",
                Long.class, storeId, name, unit);
    }
}
