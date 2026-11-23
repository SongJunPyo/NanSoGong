package com.nansogong.common;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Profile;
import org.springframework.data.redis.connection.RedisConnection;
import org.springframework.data.redis.core.RedisCallback;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.client.RestClient;

import java.util.Map;

// 🩺 환경 세팅 확인용: 서버 · PostgreSQL · Redis · 외부 연동 목업이 모두 연결됐는지 한 번에 본다
// 새 팀원이 세팅을 마치면 http://localhost:8080/api/ping 또는 화면(5173) 첫 페이지에서 확인한다
// 🚨 DB 버전 같은 내부 정보를 보여 주므로 운영(prod)에서는 이 컨트롤러 자체를 만들지 않는다 (로컬 · AWS dev 에서만)
@Profile("!prod")
@RestController
public class PingController {

    private final JdbcTemplate jdbcTemplate;
    private final StringRedisTemplate redisTemplate;
    private final RestClient posRestClient;

    public PingController(JdbcTemplate jdbcTemplate, StringRedisTemplate redisTemplate,
                          @Qualifier("posRestClient") RestClient posRestClient) {
        this.jdbcTemplate = jdbcTemplate;
        this.redisTemplate = redisTemplate;
        this.posRestClient = posRestClient;
    }

    @GetMapping("/api/ping")
    public Map<String, String> ping() {
        return Map.of(
                "server", "ok",
                "postgres", check(() -> jdbcTemplate.queryForObject("select version()", String.class)),
                "redis", check(() -> redisTemplate.execute((RedisCallback<String>) RedisConnection::ping)),
                "mock", check(() -> "POS 목업 " + posRestClient.get().uri("/menus").retrieve().toBodilessEntity().getStatusCode())
        );
    }

    private String check(java.util.function.Supplier<String> probe) {
        try {
            return probe.get();
        } catch (Exception e) {
            return "연결 실패: " + e.getClass().getSimpleName();
        }
    }
}
