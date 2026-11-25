package com.nansogong.controller;

import com.nansogong.ai.AiPingClient;
import com.nansogong.dto.AiPingResponse;
import org.springframework.context.annotation.Profile;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

// 🤖 Claude API 연결 확인. 🚨 부를 때마다 과금되므로 로그인한 사용자만, 로컬 · dev 에서만 연다
//    (/api/ping 과 달리 SecurityConfig 의 permitAll 에 넣지 않는다)
@Profile("!prod")
@RestController
public class AiPingController {

    private final AiPingClient aiPingClient;

    public AiPingController(AiPingClient aiPingClient) {
        this.aiPingClient = aiPingClient;
    }

    @GetMapping("/api/ai/ping")
    public AiPingResponse ping() {
        return aiPingClient.ping();
    }
}
