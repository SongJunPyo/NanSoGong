package com.nansogong.service;

import com.nansogong.dto.WeatherGrid;
import org.junit.jupiter.api.Test;
import org.springframework.web.client.RestClient;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.utility.DockerImageName;
import org.testcontainers.utility.MountableFile;

import java.nio.file.Path;
import java.time.Clock;

import static org.assertj.core.api.Assertions.assertThat;

/** 팀원이 실제로 실행하는 WireMock 파일의 템플릿·JSON·페이지 계약까지 검증한다. */
@Testcontainers
class WeatherMockContractTest {
    @Container
    static final GenericContainer<?> MOCK = new GenericContainer<>(DockerImageName.parse("wiremock/wiremock:3.13.2"))
            .withExposedPorts(8080).withCommand("--global-response-templating")
            .withCopyFileToContainer(MountableFile.forHostPath(Path.of("..", "mock", "mappings").toAbsolutePath().normalize()),
                    "/home/wiremock/mappings");

    @Test void committedMocksResolveAnAddressAndReturnUsableWeather() {
        String base = "http://" + MOCK.getHost() + ":" + MOCK.getMappedPort(8080);
        var locations = new WeatherLocationService(RestClient.builder().baseUrl(base + "/kakao")
                .defaultHeader("Authorization", "KakaoAK mock-key").build());
        var forecasts = new WeatherForecastService(RestClient.builder().baseUrl(base + "/kma").build(), "mock-key", Clock.systemUTC());
        var grid = locations.locate("서울 중구 세종대로 110");
        assertThat(grid).isEqualTo(new WeatherGrid(60, 127));
        var forecast = forecasts.lookup(grid);
        assertThat(forecast.temperatureC()).isEqualByComparingTo("8");
        assertThat(forecast.sky()).isEqualTo("PARTLY_CLOUDY");
        assertThat(forecast.forecastAt()).isAfter(forecast.issuedAt());
    }
}
