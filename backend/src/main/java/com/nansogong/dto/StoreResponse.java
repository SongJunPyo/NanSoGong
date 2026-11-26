package com.nansogong.dto;

import com.nansogong.model.Store;
import com.nansogong.model.StoreVerifyStatus;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

public record StoreResponse(
        Long storeId, Long memberId, String bizRegNo, String bizName, String ownerName,
        LocalDate businessOpenedOn, StoreVerifyStatus verifyStatus, Instant verifiedAt,
        String name, String category, String address,
        Map<String, List<String>> openHours, List<String> closedDays, Map<String, Boolean> onboardingStatus
) {
    public static StoreResponse from(Store store) {
        return new StoreResponse(store.getId(), store.getMemberId(), store.getBizRegNo(), store.getBizName(), store.getOwnerName(),
                store.getBusinessOpenedOn(), store.getVerifyStatus(), store.getVerifiedAt(), store.getName(), store.getCategory(), store.getAddress(),
                store.getOpenHours() == null ? Map.of() : store.getOpenHours(),
                store.getClosedDays() == null ? List.of() : store.getClosedDays(),
                store.getOnboardingStatus() == null ? Map.of() : store.getOnboardingStatus());
    }
}
