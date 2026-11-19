package com.nansogong.common;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

// 🌐 CORS: React(localhost:5173)에서 서버(localhost:8080)를 부를 수 있게 허락한다
// 허용 주소는 application.yml 의 app.cors.allowed-origins (AWS 는 환경변수 CORS_ALLOWED_ORIGINS)
// allowCredentials: 자동 로그인용 refresh 토큰을 HttpOnly 쿠키로 주고받기 위해 필요 (구현-1-3)
@Configuration
public class WebConfig implements WebMvcConfigurer {

    private final String[] allowedOrigins;

    public WebConfig(AppProperties props) {
        this.allowedOrigins = props.cors().allowedOrigins().toArray(String[]::new);
    }

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
                .allowedOrigins(allowedOrigins)       // 🚨 "*" 로 모두에게 열지 않는다
                .allowedMethods("GET", "POST", "PUT", "PATCH", "DELETE")
                .allowedHeaders("*")
                .allowCredentials(true)               // 🚨 이때는 allowedOrigins 에 "*" 를 쓸 수 없다 (브라우저가 거부)
                .exposedHeaders("Location");
    }
}
