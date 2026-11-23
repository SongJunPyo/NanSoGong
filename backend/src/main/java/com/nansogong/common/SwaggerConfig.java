package com.nansogong.common;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

// Swagger UI: http://localhost:8080/swagger-ui/index.html
// 🏦 운영(prod)에서는 application-prod.yml 이 Swagger 를 끈다 (주소 목록이 곧 공격 지도)
@Configuration
public class SwaggerConfig {

    @Bean
    public OpenAPI openAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("난소공 API")
                        .description("소상공인 맞춤형 AI 매장 운영 에이전트 · 사장님 전용 서비스")
                        .version("0.0.1"))
                // 오른쪽 위 Authorize 버튼에 로그인으로 받은 accessToken 을 넣으면 모든 요청에 붙는다
                .components(new Components().addSecuritySchemes("bearer",
                        new SecurityScheme().type(SecurityScheme.Type.HTTP).scheme("bearer").bearerFormat("JWT")))
                .addSecurityItem(new SecurityRequirement().addList("bearer"));
    }
}
