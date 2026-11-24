package com.nansogong.common;

import com.nimbusds.jose.jwk.source.ImmutableSecret;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;
import org.springframework.security.web.SecurityFilterChain;

import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;

// 🔐 "누가 어디까지 들어올 수 있나" 를 정하는 곳. 토큰 검사는 스프링 시큐리티(리소스 서버)가 해 준다
@Configuration
public class SecurityConfig {

    // 토큰 서명에 쓰는 비밀키 (HS256 = 같은 키로 서명하고 같은 키로 검증)
    private final SecretKey key;

    public SecurityConfig(AppProperties props) {
        this.key = new SecretKeySpec(props.jwt().secret().getBytes(StandardCharsets.UTF_8), "HmacSHA256");
    }

    @Bean
    JwtEncoder jwtEncoder() {       // 토큰 만들기 (로그인 API 에서 사용)
        return new NimbusJwtEncoder(new ImmutableSecret<>(key));
    }

    @Bean
    JwtDecoder jwtDecoder() {       // 토큰 검증하기 (모든 요청에서 자동 사용)
        return NimbusJwtDecoder.withSecretKey(key).macAlgorithm(MacAlgorithm.HS256).build();
    }

    @Bean
    PasswordEncoder passwordEncoder() {     // 비밀번호는 평문이 아니라 BCrypt 해시로만 보관한다
        return new BCryptPasswordEncoder();
    }

    @Bean
    SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                .cors(Customizer.withDefaults())            // 🚨 이 줄이 없으면 WebConfig 의 CORS 설정이 무시된다
                .csrf(AbstractHttpConfigurer::disable)      // 쿠키 세션 대신 토큰을 쓰므로 CSRF 는 끈다
                .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .oauth2ResourceServer(o -> o.jwt(Customizer.withDefaults()))     // Authorization: Bearer 토큰 검사
                .authorizeHttpRequests(a -> a
                        .requestMatchers("/api/auth/**", "/api/ping").permitAll()
                        .requestMatchers("/swagger-ui/**", "/swagger-ui.html", "/v3/api-docs/**").permitAll()
                        .requestMatchers("/actuator/health", "/actuator/info").permitAll()   // 로드밸런서(ALB) 상태 확인용
                        .requestMatchers("/actuator/prometheus").permitAll()                // 밖에서는 ALB 가 /actuator/* 를 막는다
                        .anyRequest().authenticated());
        return http.build();
    }
}
