package com.nansogong.dto;

/** ACTIVE는 정보 일치와 계속사업자 상태를 모두 확인한 경우에만 반환한다. */
public record AuthBusinessVerificationResponse(String bizRegNo, Status status) {
    public enum Status {
        ACTIVE, SUSPENDED, CLOSED, MISMATCH
    }
}
