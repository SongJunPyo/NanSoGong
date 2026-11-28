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

/** 커밋되는 WireMock 계약이 실제 단건·복수·0건 파서와 맞는지 확인한다. */
@Testcontainers
class HomeHolidayMockContractTest {
    @Container
    static final GenericContainer<?> MOCK = new GenericContainer<>(DockerImageName.parse("wiremock/wiremock:3.13.2"))
            .withExposedPorts(8080)
            .withCopyFileToContainer(MountableFile.forHostPath(Path.of("..", "mock", "mappings", "holiday.json").toAbsolutePath().normalize()),
                    "/home/wiremock/mappings/holiday.json");

    @Test void committedMockSupportsTheObservedShapesAndRequestedMonth() {
        var client = new HomeHolidayClient(RestClient.create("http://" + MOCK.getHost() + ":" + MOCK.getMappedPort(8080) + "/holiday"),
                "never-forward-this-key", true, JsonMapper.builder().build(), Clock.systemUTC());
        var december = client.lookup(YearMonth.of(2026, 12));
        assertThat(december.mock()).isTrue();
        assertThat(december.holidays()).singleElement().satisfies(holiday -> assertThat(holiday.name()).isEqualTo("기독탄신일"));
        assertThat(client.lookup(YearMonth.of(2026, 3)).holidays()).hasSize(2);
        assertThat(client.lookup(YearMonth.of(2026, 11)).holidays()).isEmpty();
    }
}
