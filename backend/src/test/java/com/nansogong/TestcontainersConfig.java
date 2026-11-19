package com.nansogong;

import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.context.annotation.Bean;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.postgresql.PostgreSQLContainer;
import org.testcontainers.utility.DockerImageName;

// 🧪 테스트용 PostgreSQL · Redis 를 컨테이너로 띄우고, 접속 정보는 @ServiceConnection 이 스프링에 자동으로 꽂아 준다
// → 로컬 docker compose 를 켜 두지 않아도, GitHub Actions 에서도 같은 테스트가 돈다 (Docker 만 있으면 된다)
// 버전은 docker-compose.yml 과 같게 맞춘다
@TestConfiguration(proxyBeanMethods = false)
public class TestcontainersConfig {

    @Bean
    @ServiceConnection
    PostgreSQLContainer postgres() {
        return new PostgreSQLContainer(DockerImageName.parse("postgres:17-alpine"));
    }

    @Bean
    @ServiceConnection(name = "redis")
    GenericContainer<?> redis() {
        return new GenericContainer<>(DockerImageName.parse("redis:7.0-alpine")).withExposedPorts(6379);
    }
}
