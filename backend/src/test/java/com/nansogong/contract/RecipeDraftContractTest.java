package com.nansogong.contract;

import com.nansogong.TestcontainersConfig;
import com.nansogong.dto.RecipeContextResponse;
import com.nansogong.dto.RecipeDraftValidateRequest;
import com.nansogong.dto.RecipeDraftValidateResponse;
import com.nansogong.dto.RecipeDraftValidateResponse.Reason;
import com.nansogong.model.ItemCostSource;
import com.nansogong.model.ItemUnit;
import com.nansogong.model.RecipeAppliesTo;
import jakarta.validation.Validator;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.math.BigDecimal;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 레시피 초안 내부 API 계약 (#35): contracts/recipe-draft/*.json 예시와 Java 타입의 JSON 모양이 같은지 확인한다.
 * Python(pytest)도 같은 파일로 검증하므로, 칸 이름이 바뀌면 여기서 먼저 깨진다.
 * 실제 서버와 같은 JSON 설정을 쓰려고 Spring 이 만든 ObjectMapper 를 그대로 쓴다.
 */
@SpringBootTest
@Import(TestcontainersConfig.class)
class RecipeDraftContractTest {

    /** gradle 테스트는 backend 폴더에서 실행된다 → 저장소 맨 위의 contracts/ */
    private static final Path DIR = Path.of("..", "contracts", "recipe-draft");

    @Autowired ObjectMapper objectMapper;
    @Autowired Validator validator;

    @Test
    void 검증_요청_예시를_읽을_수_있고_모르는_칸은_무시한다() throws Exception {
        RecipeDraftValidateRequest request = objectMapper.readValue(read("validate.request.json"), RecipeDraftValidateRequest.class);

        assertThat(request.menuName()).isEqualTo("딸기라떼");      // description 은 받지 않아도 오류 없이 무시
        assertThat(request.lines()).hasSize(3);
        assertThat(request.lines().get(0).itemId()).isEqualTo(2L);
        assertThat(request.lines().get(1).itemId()).isNull();
        assertThat(request.lines().get(1).qty()).isEqualByComparingTo("30");
        assertThat(validator.validate(request)).isEmpty();         // 예시가 검증 규칙(@NotBlank 등)도 통과
    }

    @Test
    void 검증_응답이_예시와_같은_모양으로_나간다() throws Exception {
        RecipeDraftValidateResponse response = new RecipeDraftValidateResponse(false, List.of(
                new RecipeDraftValidateResponse.Line(true, null, 2L, new BigDecimal("200.000"), ItemUnit.ML, new BigDecimal("2.5")),
                new RecipeDraftValidateResponse.Line(true, null, 3L, new BigDecimal("30.000"), ItemUnit.ML, null),
                new RecipeDraftValidateResponse.Line(false, Reason.ITEM_NOT_FOUND, null, null, null, null)),
                List.of(), null, List.of(3L));

        JsonNode expected = objectMapper.readTree(read("validate.response.json"));
        assertSameShape("validate.response", expected, objectMapper.valueToTree(response));

        RecipeDraftValidateResponse parsed = objectMapper.readValue(read("validate.response.json"), RecipeDraftValidateResponse.class);
        assertThat(parsed.lines().get(2).reason()).isEqualTo(Reason.ITEM_NOT_FOUND);
        assertThat(parsed.missingCosts()).containsExactly(3L);    // missingCosts 는 품목 번호 목록
    }

    @Test
    void 맥락_응답이_예시와_같은_모양으로_나간다() throws Exception {
        RecipeContextResponse response = new RecipeContextResponse(
                List.of(new RecipeContextResponse.Item(3L, "딸기퓨레", ItemUnit.ML, null, null),
                        new RecipeContextResponse.Item(2L, "우유", ItemUnit.ML, new BigDecimal("2.5"), ItemCostSource.MANUAL)),
                List.of(new RecipeContextResponse.Menu(10L, "카페라떼", "커피", new BigDecimal("4500"), List.of(
                        new RecipeContextResponse.Line(1L, "원두", ItemUnit.G, new BigDecimal("18"), RecipeAppliesTo.ALL)))));

        JsonNode expected = objectMapper.readTree(read("context.response.json"));
        assertSameShape("context.response", expected, objectMapper.valueToTree(response));
    }

    // ---- 도우미 ----

    private String read(String name) throws Exception {
        return Files.readString(DIR.resolve(name));
    }

    /**
     * 칸 이름과 값의 종류(숫자 · 글자 · 참거짓 · 객체 · 배열)가 같은지 본다. 값 자체는 비교하지 않는다.
     * null 인 칸은 키가 있는지만 본다. 배열은 첫 원소끼리 비교한다.
     */
    private void assertSameShape(String where, JsonNode expected, JsonNode actual) {
        if (expected.isObject()) {
            assertThat(actual.isObject()).as(where + " 는 객체").isTrue();
            assertThat(keys(actual)).as(where + " 의 칸 이름").isEqualTo(keys(expected));
            for (String key : keys(expected)) {
                JsonNode e = expected.get(key);
                JsonNode a = actual.get(key);
                if (!e.isNull() && !a.isNull()) {
                    assertSameShape(where + "." + key, e, a);
                }
            }
        } else if (expected.isArray()) {
            assertThat(actual.isArray()).as(where + " 는 배열").isTrue();
            if (!expected.isEmpty() && !actual.isEmpty()) {
                assertSameShape(where + "[0]", expected.get(0), actual.get(0));
            }
        } else {
            assertThat(actual.getNodeType()).as(where + " 의 값 종류").isEqualTo(expected.getNodeType());
        }
    }

    private Set<String> keys(JsonNode node) {
        return node.properties().stream().map(Map.Entry::getKey).collect(Collectors.toSet());
    }
}
