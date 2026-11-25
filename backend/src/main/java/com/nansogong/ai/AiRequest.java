package com.nansogong.ai;

import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.function.Function;
import java.util.function.Supplier;

/**
 * 구조화된 결과(계획 DTO)를 받는 AI 호출 1건.
 *
 * @param workflow       업무 (모델 · 응답 길이 · 로그 이름)
 * @param systemPrompt   prompts/ 아래 system 프롬프트 파일 이름 (확장자 제외)
 * @param userPrompt     prompts/ 아래 user 프롬프트 파일 이름 (확장자 제외)
 * @param variables      user 프롬프트의 {변수} 값. 개인정보 · 비밀값 금지
 * @param resultType     받을 계획 DTO (record)
 * @param validator      형식 검증(@NotNull 등) 뒤에 추가로 확인할 업무 규칙. 문제 목록을 돌려주고, 없으면 빈 목록
 * @param fallback       AI 실패 시 쓸 대체 결과 (예: 빈 레시피 초안, 숫자로 만든 고정 문장)
 */
public record AiRequest<T>(
        AiWorkflow workflow,
        String systemPrompt,
        String userPrompt,
        Map<String, Object> variables,
        Class<T> resultType,
        Function<T, List<String>> validator,
        Supplier<T> fallback
) {
    public AiRequest {
        Objects.requireNonNull(workflow, "workflow");
        Objects.requireNonNull(systemPrompt, "systemPrompt");
        Objects.requireNonNull(userPrompt, "userPrompt");
        Objects.requireNonNull(resultType, "resultType");
        Objects.requireNonNull(fallback, "fallback");
        variables = variables == null ? Map.of() : Map.copyOf(variables);
        validator = validator == null ? value -> List.of() : validator;
    }
}
