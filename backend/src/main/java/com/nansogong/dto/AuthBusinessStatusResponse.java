package com.nansogong.dto;

/** 상태조회 결과다. 대표자명·개업일자의 일치나 가입 허가를 의미하지 않는다. */
public record AuthBusinessStatusResponse(String bizRegNo, Status status) {
    public enum Status {
        ACTIVE, SUSPENDED, CLOSED, NOT_FOUND
    }
}
