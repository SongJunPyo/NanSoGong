package com.nansogong.service;

import com.nansogong.common.AppProperties;
import com.nansogong.dto.HomeEventCoordinates;
import com.nansogong.dto.StoreResponse;
import com.nansogong.exception.HomeEventLookupException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.within;
import static org.mockito.Mockito.*;

class HomeEventServiceTest {
    private final StoreService stores = mock(StoreService.class);
    private final HomeEventLocationService locations = mock(HomeEventLocationService.class);
    private final HomeEventClient client = mock(HomeEventClient.class);
    private final AppProperties props = mock(AppProperties.class);
    private final AppProperties.External external = mock(AppProperties.External.class);
    private HomeEventService service;

    @BeforeEach void setup() {
        when(props.external()).thenReturn(external);
        when(external.kakaoMock()).thenReturn(true); when(external.tourMock()).thenReturn(true);
        when(stores.getMine(1L, 2L)).thenReturn(new StoreResponse(2L, 1L, null, null, null, null, null, null,
                "매장", "카페", "저장된 주소", Map.of(), List.of(), Map.of()));
        service = new HomeEventService(stores, locations, client, props);
    }

    @Test void haversineMatchesKnownDistancesAndRemainsFiniteAtAntipodes() {
        var origin = new HomeEventCoordinates(0, 0);
        assertThat(HomeEventDistance.meters(origin, origin)).isZero();
        assertThat(HomeEventDistance.meters(origin, new HomeEventCoordinates(0, 1))).isCloseTo(111_195.08, within(1.0));
        assertThat(HomeEventDistance.meters(origin, new HomeEventCoordinates(0, 180))).isCloseTo(20_015_114.44, within(1.0));
    }

    @Test void radiusFilteringUsesTheUnroundedDistance() {
        var center = new HomeEventCoordinates(37, 127);
        when(locations.locate("저장된 주소")).thenReturn(center);
        var start = LocalDate.of(2026, 12, 1);
        var inside = new HomeEventCoordinates(37 + Math.toDegrees(2999.9 / 6_371_008.8), 127);
        var outside = new HomeEventCoordinates(37 + Math.toDegrees(3000.2 / 6_371_008.8), 127);
        when(client.lookup(YearMonth.of(2026, 12))).thenReturn(new HomeEventClient.MonthData(List.of(
                new HomeEventClient.EventData("1", "안쪽", start, start, "", inside),
                new HomeEventClient.EventData("2", "바깥쪽", start, start, "", outside)), 0, Instant.EPOCH, true));
        var result = service.get(1L, 2L, 2026, 12, 3000, PageRequest.of(0, 50));
        assertThat(result.events().getContent()).singleElement().satisfies(event -> {
            assertThat(event.externalId()).isEqualTo("1");
            assertThat(event.distanceMeters()).isEqualTo(3000);
        });
    }

    @Test void ownerFailureStopsAllSourceAndLocationAccess() {
        doThrow(new ResponseStatusException(HttpStatus.FORBIDDEN)).when(stores).checkOwner(1L, 2L);
        assertThatThrownBy(() -> service.get(1L, 2L, 2026, 12, 3000, PageRequest.of(0, 50))).isInstanceOf(ResponseStatusException.class);
        verifyNoInteractions(locations, client);
        verify(stores, never()).getMine(any(), any());
    }

    @Test void refusesMixedRealAndMockConfigurationBeforeSendingAnAddress() {
        when(external.kakaoMock()).thenReturn(false);
        assertThatThrownBy(() -> service.get(1L, 2L, 2026, 12, 3000, PageRequest.of(0, 50)))
                .isInstanceOfSatisfying(HomeEventLookupException.class, error -> assertThat(error.getCode()).isEqualTo("EVENT_CONFIGURATION_REQUIRED"));
        verifyNoInteractions(locations, client);
    }
}
