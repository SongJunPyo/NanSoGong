package com.nansogong.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

/** 공용 BusinessException 구현 전까지 기존 인증 API와 같은 예외 기반을 사용한다. */
public class WeatherLookupException extends ResponseStatusException {
    private final String code;

    public WeatherLookupException(HttpStatus status, String code, String message) {
        super(status, message);
        this.code = code;
    }

    public String getCode() { return code; }
}
