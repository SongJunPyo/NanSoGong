package com.nansogong.controller;

import com.nansogong.exception.WeatherLookupException;
import org.springframework.dao.DataAccessException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.server.ResponseStatusException;

/** 공용 오류 처리 없이 날씨 API에만 적용한다. 외부 예외 원문·키·주소는 응답하지 않는다. */
@RestControllerAdvice(assignableTypes = WeatherController.class)
public class WeatherExceptionHandler {
    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<WeatherError> failure(ResponseStatusException error) {
        String code = error instanceof WeatherLookupException weather ? weather.getCode()
                : error.getStatusCode().value() == 403 ? "FORBIDDEN" : "WEATHER_UNAVAILABLE";
        return ResponseEntity.status(error.getStatusCode()).body(new WeatherError(code, error.getReason()));
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<WeatherError> invalidRequest() {
        return ResponseEntity.badRequest().body(new WeatherError("INVALID_REQUEST", "매장 번호를 확인해 주세요"));
    }

    @ExceptionHandler(DataAccessException.class)
    public ResponseEntity<WeatherError> unavailable() {
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                .body(new WeatherError("WEATHER_UNAVAILABLE", "매장 정보를 확인할 수 없어요. 잠시 후 다시 시도해 주세요"));
    }

    public record WeatherError(String code, String message) {}
}
