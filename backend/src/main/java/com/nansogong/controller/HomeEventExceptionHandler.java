package com.nansogong.controller;

import com.nansogong.exception.HomeEventLookupException;
import org.springframework.dao.DataAccessException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.ServletRequestBindingException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.server.ResponseStatusException;

@RestControllerAdvice(assignableTypes = HomeEventController.class)
public class HomeEventExceptionHandler {
    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<HomeEventError> failure(ResponseStatusException error) {
        String code = error instanceof HomeEventLookupException event ? event.getCode()
                : error.getStatusCode().value() == 403 ? "FORBIDDEN" : "REQUEST_FAILED";
        return ResponseEntity.status(error.getStatusCode()).body(new HomeEventError(code, error.getReason()));
    }

    @ExceptionHandler({MethodArgumentTypeMismatchException.class, ServletRequestBindingException.class})
    public ResponseEntity<HomeEventError> invalid() {
        return ResponseEntity.badRequest().body(new HomeEventError("INVALID_REQUEST", "매장 번호·연도·월·조회 반경을 확인해 주세요"));
    }

    @ExceptionHandler(DataAccessException.class)
    public ResponseEntity<HomeEventError> unavailable() {
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                .body(new HomeEventError("EVENT_UNAVAILABLE", "매장 정보를 확인할 수 없어요. 잠시 후 다시 시도해 주세요"));
    }

    public record HomeEventError(String code, String message) {}
}
