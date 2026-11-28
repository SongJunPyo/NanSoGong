package com.nansogong.service;

import org.junit.jupiter.api.Test;
import org.springframework.web.client.RestClient;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.utility.DockerImageName;
import org.testcontainers.utility.MountableFile;
import tools.jackson.databind.json.JsonMapper;

import java.nio.file.Path;
import java.time.Clock;
import java.time.YearMonth;

import static org.assertj.core.api.Assertions.assertThat;

@Testcontainers
class HomeEventMockContractTest {
    @Container
    static final GenericContainer<?> MOCK = new GenericContainer<>(DockerImageName.parse("wiremock/wiremock:3.13.2"))
            .withExposedPorts(8080).withCommand("--global-response-templating")
            .withCopyFileToContainer(MountableFile.forHostPath(Path.of("..", "mock", "mappings", "tour-events.json").toAbsolutePath().normalize()),
                    "/home/wiremock/mappings/tour-events.json");

    @Test void committedMockUsesTheRequestedMonthAndMarksMissingCoordinates() {
        var client = new HomeEventClient(RestClient.create("http://" + MOCK.getHost() + ":" + MOCK.getMappedPort(8080) + "/tour"),
                "real-key-never-send", true, JsonMapper.builder().build(), Clock.systemUTC());
        var result = client.lookup(YearMonth.of(2027, 1));
        assertThat(result.mock()).isTrue();
        assertThat(result.events()).hasSize(3);
        assertThat(result.unlocatedEventCount()).isEqualTo(1);
        assertThat(result.events().getFirst().startDate()).hasToString("2027-01-01");
        assertThat(result.events().getFirst().title()).isEqualTo("서울시청 주변 행사 예시");
    }
}
