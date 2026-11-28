package com.nansogong.dto;

import org.springframework.data.domain.Page;

import java.time.Instant;
import java.time.LocalDate;

public record HomeEventResponse(
        Long storeId, String source, boolean mock, int year, int month, int radiusMeters,
        Instant fetchedAt, int unlocatedEventCount, Page<LocalEvent> events
) {
    public record LocalEvent(String externalId, String title, LocalDate startDate, LocalDate endDate,
                             String address, double latitude, double longitude, long distanceMeters) {}
}
