package com.nansogong.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

/** 공용 업무 예외 구현 전까지 행사 API 안에서만 사용하는 오류다. */
public class HomeEventLookupException extends ResponseStatusException {
    private final String code;

    public HomeEventLookupException(HttpStatus status, String code, String message) {
        super(status, message);
        this.code = code;
    }

    public String getCode() { return code; }
}
