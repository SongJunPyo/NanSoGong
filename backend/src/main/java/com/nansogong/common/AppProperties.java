package com.nansogong.common;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.Duration;
import java.util.List;

// ⚙️ application.yml 의 app.* 를 타입으로 읽는다
// 사용: 생성자에 AppProperties props 를 받고 props.external().kmaBaseUrl() 처럼 쓴다 (@Value 문자열 오타 방지)
// 값이 비어 있으면 서버가 뜰 때 바로 실패한다 (@Validated)
@Validated
@ConfigurationProperties(prefix = "app")
public record AppProperties(
        @Valid @NotNull Cors cors,
        @Valid @NotNull Jwt jwt,
        @Valid @NotNull Verification verification,
        @Valid @NotNull Crypto crypto,
        @Valid @NotNull External external,
        @Valid @NotNull Ai ai
) {
    // 🤖 AI 공통 설정 (ai/ 패키지). 업무별 모델 · 응답 검증 실패 시 재요청 횟수
    public record Ai(@Valid @NotNull Models models, @Min(0) @Max(3) int schemaRetries) {}

    // general = 레시피 · 운영 제안 · 쿠폰 등 기본 / browserAgent = 브라우저 주문 · 대안 탐색 (여러 단계 화면 조작)
    public record Models(@NotBlank String general, @NotBlank String browserAgent) {}

    public record Cors(@NotNull List<String> allowedOrigins) {}

    public record Jwt(@NotBlank String secret, @NotNull Duration accessTokenTtl, @NotNull Duration refreshTokenTtl) {}

    public record Verification(@NotNull Mode mode, String mockCode) {
        public enum Mode { MOCK, REAL }
    }

    public record Crypto(@NotBlank String credentialKey) {}

    public record External(
            @NotBlank String dataGoKrServiceKey,
            @NotBlank String ntsBaseUrl,
            @NotBlank String kmaBaseUrl,
            @NotBlank String holidayBaseUrl,
            @NotBlank String naverDatalabBaseUrl,
            @NotBlank String naverClientId,
            @NotBlank String naverClientSecret,
            @NotBlank String posBaseUrl,
            @NotBlank String supplierBaseUrl,
            @NotBlank String mydataBaseUrl,
            @NotNull Duration connectTimeout,
            @NotNull Duration readTimeout
    ) {}
}
