package com.nansogong.common;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

import jakarta.validation.Valid;
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
        @Valid @NotNull Session session,
        @Valid @NotNull Sens sens
) {
    public record Cors(@NotNull List<String> allowedOrigins) {}

    public record Jwt(@NotBlank String secret, @NotNull Duration accessTokenTtl, @NotNull Duration refreshTokenTtl) {}

    public record Verification(@NotNull Mode mode, String mockCode) {
        public enum Mode { MOCK, REAL }
    }

    public record Crypto(@NotBlank String credentialKey) {}

    public record Session(boolean cookieSecure, @NotBlank String cookieSameSite) {
        public Session {
            if (!java.util.Set.of("Strict", "Lax", "None").contains(cookieSameSite)
                    || ("None".equals(cookieSameSite) && !cookieSecure)) {
                throw new IllegalArgumentException("쿠키 SameSite·Secure 설정을 확인해 주세요");
            }
        }
    }
    public record Sens(@NotBlank String baseUrl, String serviceId, String accessKey, String secretKey, String from) {
        @Override public String toString() { return "Sens[redacted]"; }
    }

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
