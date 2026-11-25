package com.nansogong.ai;

import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.client.advisor.SimpleLoggerAdvisor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Spring AI ChatClient 설정. 모든 AI 호출은 이 ChatClient 하나를 쓴다.
 * <p>
 * SimpleLoggerAdvisor: 요청 · 응답을 DEBUG 로그로 남긴다. 로컬 · dev 에서만 켜지고 prod 는 application-aws.yml 에서 끈다
 * (프롬프트에 매장 집계값이 들어가므로). 업무 코드는 ChatClient 를 직접 쓰지 말고 {@link AiStructuredCaller} 를 쓴다.
 */
@Configuration
public class AiConfig {

    @Bean
    ChatClient chatClient(ChatClient.Builder builder) {
        return builder
                .defaultAdvisors(new SimpleLoggerAdvisor())
                .build();
    }
}
