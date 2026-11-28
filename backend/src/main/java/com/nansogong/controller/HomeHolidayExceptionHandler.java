package com.nansogong.controller;

import com.nansogong.exception.HomeHolidayLookupException;
import org.springframework.dao.DataAccessException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.ServletRequestBindingException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.server.ResponseStatusException;

/** 공휴일 API에만 적용한다. 공급자 응답·URL·인증키는 오류에 포함하지 않는다. */
@RestControllerAdvice(assignableTypes = HomeHolidayController.class)
public class HomeHolidayExceptionHandler {
    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<HomeHolidayError> failure(ResponseStatusException error) {
        String code = error instanceof HomeHolidayLookupException holiday ? holiday.getCode()
                : error.getStatusCode().value() == 403 ? "FORBIDDEN" : "HOLIDAY_UNAVAILABLE";
        return ResponseEntity.status(error.getStatusCode()).body(new HomeHolidayError(code, error.getReason()));
    }

    @ExceptionHandler({MethodArgumentTypeMismatchException.class, ServletRequestBindingException.class})
    public ResponseEntity<HomeHolidayError> invalidRequest() {
        return ResponseEntity.badRequest().body(new HomeHolidayError("INVALID_REQUEST", "매장 번호·연도·월을 확인해 주세요"));
    }

    @ExceptionHandler(DataAccessException.class)
    public ResponseEntity<HomeHolidayError> unavailable() {
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                .body(new HomeHolidayError("HOLIDAY_UNAVAILABLE", "매장 정보를 확인할 수 없어요. 잠시 후 다시 시도해 주세요"));
    }

    public record HomeHolidayError(String code, String message) {}
}
