package com.nansogong.ai;

import com.nansogong.common.AppProperties;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import org.junit.jupiter.api.Test;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.messages.AssistantMessage;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.ai.chat.model.ChatResponse;
import org.springframework.ai.chat.model.Generation;
import org.springframework.ai.chat.prompt.Prompt;

import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

// 🤖 AI 공통 호출기: 진짜 Claude 대신 정해진 답을 돌려주는 가짜 ChatModel 로 확인한다 (과금 없음, Docker 불필요)
class AiStructuredCallerTest {

    record TestPlan(@NotBlank String name, @NotNull @Positive Integer qty) {
        static TestPlan empty() {
            return new TestPlan("대체", 1);
        }
    }

    /** 미리 넣어 둔 답을 차례로 돌려주고, 받은 요청을 기록한다 */
    static class FakeChatModel implements ChatModel {
        final Deque<Object> replies = new ArrayDeque<>();
        final List<Prompt> received = new ArrayList<>();

        FakeChatModel reply(String text) {
            replies.add(text);
            return this;
        }

        FakeChatModel fail(RuntimeException e) {
            replies.add(e);
            return this;
        }

        @Override
        public ChatResponse call(Prompt prompt) {
            received.add(prompt);
            Object next = replies.removeFirst();
            if (next instanceof RuntimeException e) {
                throw e;
            }
            return new ChatResponse(List.of(new Generation(new AssistantMessage((String) next))));
        }
    }

    private final Validator validator = Validation.buildDefaultValidatorFactory().getValidator();

    private AiStructuredCaller caller(FakeChatModel model, String apiKey) {
        AppProperties props = new AppProperties(null, null, null, null, null,
                new AppProperties.Ai(new AppProperties.Models("claude-haiku-5-5", "claude-sonnet-5-5"), 1));
        return new AiStructuredCaller(ChatClient.builder(model).build(), validator, props, apiKey);
    }

    private AiRequest<TestPlan> request() {
        return new AiRequest<>(AiWorkflow.RECIPE_DRAFT, "test-plan-system", "test-plan-user",
                Map.of("menuName", "바닐라라떼"), TestPlan.class,
                plan -> plan.qty() > 100 ? List.of("qty 는 100 이하") : List.of(),
                TestPlan::empty);
    }

    @Test
    void 정상_응답이면_AI_결과를_돌려준다() {
        FakeChatModel model = new FakeChatModel().reply("{\"name\":\"라떼\",\"qty\":2}");

        AiResult<TestPlan> result = caller(model, "sk-test").call(request());

        assertThat(result.aiGenerated()).isTrue();
        assertThat(result.value()).isEqualTo(new TestPlan("라떼", 2));
        assertThat(model.received).hasSize(1);
        String userText = model.received.getFirst().getUserMessage().getText();
        assertThat(userText).contains("메뉴 바닐라라떼 의 계획").contains("JSON");
        assertThat(model.received.getFirst().getOptions().getModel()).isEqualTo("claude-haiku-5-5");
    }

    @Test
    void 검증에_실패하면_문제를_알려_주고_한_번만_다시_요청한다() {
        FakeChatModel model = new FakeChatModel()
                .reply("{\"name\":\"라떼\",\"qty\":500}")      // 업무 규칙 위반
                .reply("{\"name\":\"라떼\",\"qty\":5}");

        AiResult<TestPlan> result = caller(model, "sk-test").call(request());

        assertThat(result.aiGenerated()).isTrue();
        assertThat(result.value().qty()).isEqualTo(5);
        assertThat(model.received).hasSize(2);
        assertThat(model.received.get(1).getUserMessage().getText()).contains("이전 응답의 문제").contains("qty 는 100 이하");
    }

    @Test
    void 두_번_모두_형식이_틀리면_대체_결과를_돌려주고_틀린_결과는_내보내지_않는다() {
        FakeChatModel model = new FakeChatModel()
                .reply("JSON 이 아닌 답")
                .reply("{\"name\":\"\",\"qty\":-1}");           // @NotBlank · @Positive 위반

        AiResult<TestPlan> result = caller(model, "sk-test").call(request());

        assertThat(result.aiGenerated()).isFalse();
        assertThat(result.failureReason()).isEqualTo("INVALID_RESULT");
        assertThat(result.value()).isEqualTo(TestPlan.empty());
        assertThat(model.received).hasSize(2);
    }

    @Test
    void 키가_없으면_호출하지_않고_대체_결과를_돌려준다() {
        FakeChatModel model = new FakeChatModel();

        AiResult<TestPlan> result = caller(model, AiStructuredCaller.NO_KEY).call(request());

        assertThat(result.aiGenerated()).isFalse();
        assertThat(result.failureReason()).isEqualTo("NO_API_KEY");
        assertThat(model.received).isEmpty();
    }

    @Test
    void 호출_오류는_재요청하지_않고_대체_결과로_처리한다() {
        FakeChatModel model = new FakeChatModel().fail(new IllegalStateException("network"));

        AiResult<TestPlan> result = caller(model, "sk-test").call(request());

        assertThat(result.aiGenerated()).isFalse();
        assertThat(result.failureReason()).isEqualTo("CALL_FAILED:IllegalStateException");
        assertThat(model.received).hasSize(1);
    }

    @Test
    void 브라우저_에이전트_업무는_상위_모델을_쓴다() {
        AiStructuredCaller caller = caller(new FakeChatModel(), "sk-test");

        assertThat(caller.modelFor(AiWorkflow.PURCHASE_BROWSER_AGENT)).isEqualTo("claude-sonnet-5-5");
        assertThat(caller.modelFor(AiWorkflow.COUPON_PLAN)).isEqualTo("claude-haiku-5-5");
    }
}
