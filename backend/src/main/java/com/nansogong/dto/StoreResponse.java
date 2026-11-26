package com.nansogong.dto;

import com.nansogong.model.Store;
import com.nansogong.model.StoreVerifyStatus;

import java.time.LocalDate;

/** 매장 정보 응답 */
public record StoreResponse(
        Long id,
        String name,
        String bizName,
        String bizRegNo,
        String ownerName,
        LocalDate businessOpenedOn,
        String category,
        String address,
        StoreVerifyStatus verifyStatus
) {
    public static StoreResponse from(Store store) {
        return new StoreResponse(store.getId(), store.getName(), store.getBizName(), store.getBizRegNo(),
                store.getOwnerName(), store.getBusinessOpenedOn(), store.getCategory(), store.getAddress(),
                store.getVerifyStatus());
    }
}
