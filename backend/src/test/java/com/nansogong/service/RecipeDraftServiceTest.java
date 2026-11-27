package com.nansogong.service;

import com.nansogong.TestcontainersConfig;
import com.nansogong.dto.RecipeContextResponse;
import com.nansogong.dto.RecipeDraftValidateRequest;
import com.nansogong.dto.RecipeDraftValidateResponse;
import com.nansogong.dto.RecipeDraftValidateResponse.Reason;
import com.nansogong.dto.RecipeSaveRequest;
import com.nansogong.model.ItemCostSource;
import com.nansogong.model.ItemUnit;
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
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.sql.Timestamp;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** AI 레시피 초안 맥락 조회 · 초안 검증 (#35 ① ②) */
@SpringBootTest
@Import(TestcontainersConfig.class)
@Transactional
class RecipeDraftServiceTest {

    @Autowired RecipeDraftService recipeDraftService;
    @Autowired RecipeService recipeService;
    @Autowired MemberRepository memberRepository;
    @Autowired StoreRepository storeRepository;
    @Autowired MenuRepository menuRepository;
    @Autowired JdbcTemplate jdbc;

    Long memberId, storeId, latteId;
    Long beanId, milkId, pureeId, oldSyrupId, otherStoreItemId;

    @BeforeEach
    void setUp() {
        memberId = memberRepository.save(Member.create("draft-owner", "hash", "사장", "010-0000-0000")).getId();
        Member other = memberRepository.save(Member.create("draft-other", "hash", "남", "010-0000-0001"));
        storeId = storeRepository.save(Store.create(memberId, "1230000097", "내카페", "사장", LocalDate.of(2023, 1, 1))).getId();
        Long otherStoreId = storeRepository.save(Store.create(other.getId(), "1230000096", "남의카페", "남", LocalDate.of(2023, 1, 1))).getId();

        beanId = item(storeId, "원두", "G");
        milkId = item(storeId, "우유", "ML");
        pureeId = item(storeId, "딸기퓨레", "ML");          // 단가 기록 없음
        oldSyrupId = item(storeId, "옛시럽", "ML");
        otherStoreItemId = item(otherStoreId, "남의 원두", "G");
        cost(beanId, "25");
        cost(milkId, "2.5");
        cost(oldSyrupId, "10");

        latteId = menuRepository.save(Menu.create(storeId, "카페라떼", "커피", new BigDecimal("4500"), MenuSource.MANUAL)).getId();
        recipeService.saveRecipe(memberId, storeId, latteId, new RecipeSaveRequest(List.of(
                new RecipeSaveRequest.Line(beanId, new BigDecimal("18"), null),
                new RecipeSaveRequest.Line(milkId, new BigDecimal("200"), null))));
        menuRepository.save(Menu.createOption(storeId, latteId, "샷 추가", new BigDecimal("500"), MenuSource.MANUAL));   // 옵션은 맥락에서 빠진다
        // JDBC 로 바꾸면 같은 트랜잭션에 이미 올라온 Menu 객체에는 반영되지 않아서, 엔티티 메서드로 판매 중지한다
        Menu stopped = Menu.create(storeId, "단종메뉴", "커피", new BigDecimal("3000"), MenuSource.MANUAL);
        stopped.changeSaleStatus(MenuSaleStatus.INACTIVE);
        menuRepository.save(stopped);

        jdbc.update("UPDATE item SET is_active = false WHERE item_id = ?", oldSyrupId);   // 레시피에 넣은 뒤가 아니라 처음부터 중지
    }

    // ---- ① 맥락 조회 ----

    @Test
    void 맥락에는_사용_중_품목과_현재_단가가_나오고_단가가_없으면_비운다() {
        RecipeContextResponse context = recipeDraftService.context(memberId, storeId);

        assertThat(context.items()).extracting(RecipeContextResponse.Item::name)
                .containsExactly("딸기퓨레", "우유", "원두");   // 이름 순, 사용 중지 · 다른 매장 품목 없음
        RecipeContextResponse.Item bean = context.items().stream().filter(i -> i.itemId().equals(beanId)).findFirst().orElseThrow();
        assertThat(bean.unitCost()).isEqualByComparingTo("25");
        assertThat(bean.costSource()).isEqualTo(ItemCostSource.MANUAL);
        RecipeContextResponse.Item puree = context.items().stream().filter(i -> i.itemId().equals(pureeId)).findFirst().orElseThrow();
        assertThat(puree.unitCost()).isNull();
        assertThat(puree.costSource()).isNull();
    }

    @Test
    void 맥락에는_판매_중지와_옵션을_뺀_기본_메뉴와_지금_레시피가_나온다() {
        RecipeContextResponse context = recipeDraftService.context(memberId, storeId);

        assertThat(context.menus()).extracting(RecipeContextResponse.Menu::name).containsExactly("카페라떼");
        assertThat(context.menus().get(0).recipe())
                .extracting(RecipeContextResponse.Line::itemName, RecipeContextResponse.Line::unit)
                .containsExactlyInAnyOrder(
                        org.assertj.core.groups.Tuple.tuple("원두", ItemUnit.G),
                        org.assertj.core.groups.Tuple.tuple("우유", ItemUnit.ML));
    }

    // ---- ② 초안 검증 ----

    @Test
    void 정상_초안은_단위를_바꾸고_원가를_계산한다() {
        RecipeDraftValidateResponse result = validate(
                line(beanId, "원두", "18", "g"),          // 번호로 찾기, 단위 소문자
                line(null, " 우유 ", "0.2", "L"));        // 이름으로 찾기(앞뒤 공백 무시), L → ML

        assertThat(result.valid()).isTrue();
        assertThat(result.lines()).allMatch(RecipeDraftValidateResponse.Line::ok);
        assertThat(result.lines().get(1).itemId()).isEqualTo(milkId);
        assertThat(result.lines().get(1).normalizedQty()).isEqualByComparingTo("200");
        assertThat(result.lines().get(1).unit()).isEqualTo(ItemUnit.ML);
        assertThat(result.totalCost()).isEqualByComparingTo("950.00");   // 18 × 25 + 200 × 2.5
        assertThat(result.missingCosts()).isEmpty();
        assertThat(result.reasons()).isEmpty();
    }

    @Test
    void KG는_G로_바꾼다() {
        RecipeDraftValidateResponse result = validate(line(null, "원두", "0.018", "KG"));
        assertThat(result.lines().get(0).normalizedQty()).isEqualByComparingTo("18");
        assertThat(result.totalCost()).isEqualByComparingTo("450.00");
    }

    @Test
    void 매장에_없는_재료는_ITEM_NOT_FOUND_이고_원가를_내지_않는다() {
        RecipeDraftValidateResponse result = validate(
                line(null, "우유", "200", "ML"),
                line(null, "생딸기", "50", "G"));

        assertThat(result.valid()).isFalse();
        assertThat(result.lines().get(0).ok()).isTrue();           // 결과는 요청 순서 그대로
        assertThat(result.lines().get(1).reason()).isEqualTo(Reason.ITEM_NOT_FOUND);
        assertThat(result.totalCost()).isNull();
    }

    @Test
    void 다른_매장_품목_번호는_ITEM_NOT_FOUND() {
        RecipeDraftValidateResponse result = validate(line(otherStoreItemId, "남의 원두", "18", "G"));
        assertThat(result.lines().get(0).reason()).isEqualTo(Reason.ITEM_NOT_FOUND);
        assertThat(result.lines().get(0).itemId()).isNull();   // 남의 매장 품목 정보를 돌려주지 않음
    }

    @Test
    void 사용_중지_품목은_번호면_ITEM_INACTIVE_이름이면_ITEM_NOT_FOUND() {
        RecipeDraftValidateResponse byId = validate(line(oldSyrupId, "옛시럽", "20", "ML"));
        RecipeDraftValidateResponse byName = validate(line(null, "옛시럽", "20", "ML"));
        assertThat(byId.lines().get(0).reason()).isEqualTo(Reason.ITEM_INACTIVE);
        assertThat(byName.lines().get(0).reason()).isEqualTo(Reason.ITEM_NOT_FOUND);
    }

    @Test
    void 단위를_바꿀_수_없으면_UNIT_MISMATCH_모르는_단위면_UNKNOWN_UNIT() {
        RecipeDraftValidateResponse result = validate(
                line(null, "우유", "200", "G"),
                line(null, "원두", "1", "스푼"));
        assertThat(result.lines().get(0).reason()).isEqualTo(Reason.UNIT_MISMATCH);
        assertThat(result.lines().get(0).unit()).isEqualTo(ItemUnit.ML);   // 품목 단위를 알려 줘서 AI 가 고칠 수 있게
        assertThat(result.lines().get(1).reason()).isEqualTo(Reason.UNKNOWN_UNIT);
    }

    @Test
    void 같은_재료가_두_번_나오면_두_번째가_DUPLICATE_ITEM() {
        RecipeDraftValidateResponse result = validate(
                line(milkId, "우유", "200", "ML"),
                line(null, "우유", "50", "ML"));
        assertThat(result.lines().get(0).ok()).isTrue();
        assertThat(result.lines().get(1).reason()).isEqualTo(Reason.DUPLICATE_ITEM);
        assertThat(result.valid()).isFalse();
    }

    @Test
    void 사용량이_0_이하면_INVALID_QTY() {
        RecipeDraftValidateResponse result = validate(
                line(null, "원두", "0", "G"),
                line(null, "우유", "-10", "ML"),
                line(pureeId, "딸기퓨레", "0.0001", "ML"));   // 소수 3자리로 반올림하면 0 (위 줄과 다른 품목이어야 중복으로 걸리지 않음)
        assertThat(result.lines()).extracting(RecipeDraftValidateResponse.Line::reason)
                .containsExactly(Reason.INVALID_QTY, Reason.INVALID_QTY, Reason.INVALID_QTY);
    }

    @Test
    void 단가가_없는_재료는_통과시키되_원가는_내지_않고_알려준다() {
        RecipeDraftValidateResponse result = validate(
                line(null, "우유", "200", "ML"),
                line(null, "딸기퓨레", "30", "ML"));

        assertThat(result.valid()).isTrue();
        assertThat(result.lines().get(1).unitCost()).isNull();
        assertThat(result.missingCosts()).containsExactly(pureeId);
        assertThat(result.totalCost()).isNull();   // 확인되지 않은 단가로 원가를 만들지 않음
    }

    @Test
    void 미래_단가는_쓰지_않는다() {
        jdbc.update("INSERT INTO item_cost (store_id, item_id, unit_cost, effective_from, source, created_at) VALUES (?, ?, ?, ?, 'MANUAL', now())",
                storeId, beanId, new BigDecimal("99"), Timestamp.from(Instant.now().plus(Duration.ofDays(3))));
        RecipeDraftValidateResponse result = validate(line(beanId, "원두", "18", "G"));
        assertThat(result.lines().get(0).unitCost()).isEqualByComparingTo("25");
    }

    @Test
    void 남의_매장이면_403() {
        Member stranger = memberRepository.save(Member.create("draft-stranger", "hash", "모름", "010-0000-0002"));
        assertForbidden(() -> recipeDraftService.context(stranger.getId(), storeId));
        assertForbidden(() -> recipeDraftService.validate(stranger.getId(), storeId,
                new RecipeDraftValidateRequest("라떼", List.of(line(null, "우유", "200", "ML")))));
    }

    // ---- 도우미 ----

    private RecipeDraftValidateResponse validate(RecipeDraftValidateRequest.Line... lines) {
        return recipeDraftService.validate(memberId, storeId, new RecipeDraftValidateRequest("딸기라떼", List.of(lines)));
    }

    private RecipeDraftValidateRequest.Line line(Long itemId, String name, String qty, String unit) {
        return new RecipeDraftValidateRequest.Line(itemId, name, new BigDecimal(qty), unit);
    }

    private Long item(Long store, String name, String unit) {
        return jdbc.queryForObject(
                "INSERT INTO item (store_id, name, item_type, unit) VALUES (?, ?, 'INGREDIENT', ?) RETURNING item_id",
                Long.class, store, name, unit);
    }

    private void cost(Long itemId, String unitCost) {
        jdbc.update("INSERT INTO item_cost (store_id, item_id, unit_cost, effective_from, source, created_at) VALUES (?, ?, ?, ?, 'MANUAL', now())",
                storeId, itemId, new BigDecimal(unitCost), Timestamp.from(Instant.now().minus(Duration.ofDays(1))));
    }

    private void assertForbidden(Runnable call) {
        assertThatThrownBy(call::run)
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(e -> assertThat(((ResponseStatusException) e).getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN));
    }
}
