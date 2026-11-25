package com.nansogong.ai;

import com.nansogong.common.AppProperties;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validator;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.anthropic.AnthropicChatOptions;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.messages.SystemMessage;
import org.springframework.ai.chat.messages.UserMessage;
import org.springframework.ai.chat.metadata.Usage;
import org.springframework.ai.chat.model.ChatResponse;
import org.springframework.ai.converter.BeanOutputConverter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;

/**
 * AI 공통 호출기: 프롬프트 → Claude → 계획 DTO 변환 → 검증 → (실패 시 1회 재요청) → 대체 결과.
 * <p>
 * 원칙 (AGENTS.md 5-2, 유저 플로우 1.04)
 * <ul>
 *   <li>AI 는 해석 · 후보 · 설명만 만든다. 수량 · 금액 · 권한 · 승인 검증은 호출한 도메인 service 가 다시 한다</li>
 *   <li>형식 · 검증에 실패한 결과는 절대 돌려주지 않는다 → 대체 결과(aiGenerated=false)를 돌려준다</li>
 *   <li>예외를 밖으로 던지지 않는다. 키 없음 · 네트워크 오류 · 응답 거절도 대체 결과로 처리해 화면이 멈추지 않게 한다</li>
 *   <li>로그에는 업무 · 모델 · 시도 횟수 · 토큰 수만 남긴다 (프롬프트 · 응답 원문은 SimpleLoggerAdvisor DEBUG 에서만)</li>
 * </ul>
 * 사용 예)
 * <pre>
 * AiResult&lt;RecipeDraftPlan&gt; r = caller.call(new AiRequest&lt;&gt;(
 *         AiWorkflow.RECIPE_DRAFT, "recipe-draft-system", "recipe-draft-user",
 *         Map.of("menuName", "바닐라라떼", "items", itemsJson),
 *         RecipeDraftPlan.class, plan -&gt; checkItemIds(plan), RecipeDraftPlan::empty));
 * </pre>
 */
@Slf4j
@Component
public class AiStructuredCaller {

    static final String NO_KEY = "no-key";

    private final ChatClient chatClient;
    private final Validator validator;
    private final AppProperties.Ai props;
    private final String apiKey;

    public AiStructuredCaller(ChatClient chatClient, Validator validator, AppProperties appProperties,
                              @Value("${spring.ai.anthropic.api-key:" + NO_KEY + "}") String apiKey) {
        this.chatClient = chatClient;
        this.validator = validator;
        this.props = appProperties.ai();
        this.apiKey = apiKey;
    }

    public <T> AiResult<T> call(AiRequest<T> request) {
        AiWorkflow workflow = request.workflow();
        if (!hasApiKey()) {
            log.info("AI 호출 생략 workflow={} reason=NO_API_KEY", workflow);
            return AiResult.ofFallback(request.fallback().get(), "NO_API_KEY");
        }

        BeanOutputConverter<T> converter = new BeanOutputConverter<>(request.resultType());
        String system = AiPrompts.render(request.systemPrompt());
        String user = AiPrompts.render(request.userPrompt(), request.variables())
                + "\n\n" + converter.getFormat();
        String model = modelFor(workflow);

        List<String> problems = List.of();
        int maxAttempts = 1 + props.schemaRetries();
        for (int attempt = 1; attempt <= maxAttempts; attempt++) {
            String prompt = attempt == 1 ? user : user + retryFeedback(problems);

            ChatResponse response;
            try {
                response = chatClient.prompt()
                        .messages(new SystemMessage(system), new UserMessage(prompt))
                        .options(AnthropicChatOptions.builder().model(model).maxTokens(workflow.maxTokens()))
                        .call()
                        .chatResponse();
            } catch (RuntimeException e) {
                // 네트워크 · 인증 · 요청 한도 오류: SDK 가 이미 재시도했으므로 다시 부르지 않고 대체 결과로 간다
                log.warn("AI 호출 실패 workflow={} model={} attempt={} error={}",
                        workflow, model, attempt, e.getClass().getSimpleName());
                return AiResult.ofFallback(request.fallback().get(), "CALL_FAILED:" + e.getClass().getSimpleName());
            }
            logUsage(workflow, model, attempt, response);

            String text = textOf(response);
            if (text == null || text.isBlank()) {
                problems = List.of("응답이 비어 있다");
                continue;
            }
            T value;
            try {
                value = converter.convert(text);
            } catch (RuntimeException e) {
                problems = List.of("요구한 JSON 형식이 아니다");
                continue;
            }
            problems = validate(value, request);
            if (problems.isEmpty()) {
                return AiResult.ofAi(value);
            }
        }

        log.info("AI 결과 검증 실패 workflow={} model={} problems={}", workflow, model, problems.size());
        return AiResult.ofFallback(request.fallback().get(), "INVALID_RESULT");
    }

    boolean hasApiKey() {
        return apiKey != null && !apiKey.isBlank() && !NO_KEY.equals(apiKey);
    }

    String modelFor(AiWorkflow workflow) {
        return switch (workflow.tier()) {
            case GENERAL -> props.models().general();
            case BROWSER_AGENT -> props.models().browserAgent();
        };
    }

    private <T> List<String> validate(T value, AiRequest<T> request) {
        if (value == null) {
            return List.of("응답이 비어 있다");
        }
        List<String> problems = new ArrayList<>();
        Set<ConstraintViolation<T>> violations = validator.validate(value);
        for (ConstraintViolation<T> v : violations) {
            problems.add(v.getPropertyPath() + ": " + v.getMessage());
        }
        if (problems.isEmpty()) {
            problems.addAll(request.validator().apply(value));
        }
        return problems;
    }

    private static String retryFeedback(List<String> problems) {
        StringBuilder sb = new StringBuilder("\n\n[이전 응답의 문제]\n");
        problems.forEach(p -> sb.append("- ").append(p).append('\n'));
        sb.append("위 문제를 고쳐 같은 JSON 형식으로만 다시 답하라.");
        return sb.toString();
    }

    private static String textOf(ChatResponse response) {
        if (response == null || response.getResult() == null || response.getResult().getOutput() == null) {
            return null;
        }
        return response.getResult().getOutput().getText();
    }

    private static void logUsage(AiWorkflow workflow, String model, int attempt, ChatResponse response) {
        Usage usage = response == null || response.getMetadata() == null ? null : response.getMetadata().getUsage();
        log.info("AI 호출 workflow={} model={} attempt={} inputTokens={} outputTokens={}",
                workflow, model, attempt,
                usage == null ? null : usage.getPromptTokens(),
                usage == null ? null : usage.getCompletionTokens());
    }
}
