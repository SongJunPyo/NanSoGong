package com.nansogong.ai;

import com.nansogong.dto.AiPingResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.anthropic.AnthropicChatOptions;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.messages.UserMessage;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

/**
 * Claude API 연결 확인 (구현 계획서 D3). 🚨 부를 때마다 과금되므로 로컬 · dev 에서만 만든다.
 * 키가 없으면 호출하지 않고 안내 문구만 돌려준다.
 */
@Slf4j
@Profile("!prod")
@Component
public class AiPingClient {

    private final ChatClient chatClient;
    private final AiStructuredCaller caller;

    public AiPingClient(ChatClient chatClient, AiStructuredCaller caller) {
        this.chatClient = chatClient;
        this.caller = caller;
    }

    public AiPingResponse ping() {
        String model = caller.modelFor(AiWorkflow.PING);
        if (!caller.hasApiKey()) {
            return new AiPingResponse("NO_KEY", model, null,
                    ".env 에 ANTHROPIC_API_KEY 를 넣고 서버를 다시 띄우면 AI 기능을 쓸 수 있습니다");
        }
        try {
            String reply = chatClient.prompt()
                    .messages(new UserMessage(AiPrompts.render("ai-ping")))
                    .options(AnthropicChatOptions.builder().model(model).maxTokens(AiWorkflow.PING.maxTokens()))
                    .call()
                    .content();
            return new AiPingResponse("OK", model, reply, "Claude API 에 연결됐습니다");
        } catch (RuntimeException e) {
            log.warn("AI 연결 확인 실패 model={} error={}", model, e.getClass().getSimpleName());
            return new AiPingResponse("ERROR", model, null,
                    "Claude API 호출에 실패했습니다 (" + e.getClass().getSimpleName() + "). 키 · 모델 이름 · 네트워크를 확인하세요");
        }
    }
}
