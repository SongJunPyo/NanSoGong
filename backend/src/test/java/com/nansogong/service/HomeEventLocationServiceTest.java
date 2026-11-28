package com.nansogong.service;

import com.nansogong.exception.HomeEventLookupException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.queryParam;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

class HomeEventLocationServiceTest {
    private MockRestServiceServer server;
    private HomeEventLocationService service;

    @BeforeEach void setup() {
        var builder = RestClient.builder().baseUrl("https://kakao.test");
        server = MockRestServiceServer.bindTo(builder).build();
        service = new HomeEventLocationService(builder.build());
    }

    @Test void preservesWgs84CoordinatesAndCachesTheNormalizedAddress() {
        server.expect(request -> assertThat(request.getURI().getQuery()).contains("query=서울 중구 세종대로 110")).andRespond(withSuccess(
                "{\"meta\":{\"total_count\":1},\"documents\":[{\"x\":\"126.977918351844\",\"y\":\"37.566370776634\"}]}", MediaType.APPLICATION_JSON));
        var result = service.locate(" 서울 중구 세종대로 110 ");
        assertThat(result.longitude()).isEqualTo(126.977918351844);
        assertThat(result.latitude()).isEqualTo(37.566370776634);
        assertThat(service.locate("서울 중구 세종대로 110")).isEqualTo(result);
        server.verify();
    }

    @ParameterizedTest
    @ValueSource(strings = {"", "   "})
    void requiresAnAddressBeforeAnyRequest(String address) { assertCode(address, "STORE_ADDRESS_REQUIRED"); }

    @Test void refusesMissingAndAmbiguousMatches() {
        server.expect(queryParam("query", "test")).andRespond(withSuccess("{\"meta\":{\"total_count\":0},\"documents\":[]}", MediaType.APPLICATION_JSON));
        server.expect(queryParam("query", "test")).andRespond(withSuccess("{\"meta\":{\"total_count\":2},\"documents\":[{},{}]}", MediaType.APPLICATION_JSON));
        assertCode("test", "STORE_ADDRESS_NOT_FOUND"); assertCode("test", "STORE_ADDRESS_AMBIGUOUS");
    }

    @ParameterizedTest
    @ValueSource(strings = {"NaN", "999", "0"})
    void invalidLocationNeverBecomesTheOrigin(String longitude) {
        server.expect(queryParam("query", "test")).andRespond(withSuccess(
                "{\"meta\":{\"total_count\":1},\"documents\":[{\"x\":\"" + longitude + "\",\"y\":\"37.5\"}]}", MediaType.APPLICATION_JSON));
        assertCode("test", "EVENT_INVALID_LOCATION");
    }

    private void assertCode(String address, String code) {
        assertThatThrownBy(() -> service.locate(address)).isInstanceOfSatisfying(HomeEventLookupException.class,
                error -> assertThat(error.getCode()).isEqualTo(code));
    }
}
