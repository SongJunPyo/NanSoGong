package com.nansogong.controller;

import com.nansogong.dto.AuthErrorResponse;
import org.springframework.dao.DataAccessException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.server.ResponseStatusException;

/** 공용 핸들러 구현 전, 이번 회원·매장 API에만 오류 변환을 적용한다. 원본 예외는 노출하지 않는다. */
@RestControllerAdvice(assignableTypes = {AuthController.class, AuthPhoneVerificationController.class, MemberController.class, StoreController.class})
public class AuthExceptionHandler {
    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<AuthErrorResponse> businessFailure(ResponseStatusException exception) {
        String code = switch (exception.getStatusCode().value()) {
            case 400 -> "INVALID_REQUEST";
            case 401 -> "UNAUTHORIZED";
            case 403 -> "FORBIDDEN";
            case 404 -> "NOT_FOUND";
            case 409 -> "CONFLICT";
            case 502 -> "NTS_INVALID_RESPONSE";
            default -> "UNAVAILABLE";
        };
        return ResponseEntity.status(exception.getStatusCode()).body(new AuthErrorResponse(code, exception.getReason()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<AuthErrorResponse> invalidFields(MethodArgumentNotValidException exception) {
        var field = exception.getBindingResult().getFieldError();
        return badRequest(field == null ? "입력값을 확인해 주세요" : field.getDefaultMessage());
    }

    @ExceptionHandler({HttpMessageNotReadableException.class, MethodArgumentTypeMismatchException.class})
    public ResponseEntity<AuthErrorResponse> invalidRequest() { return badRequest("입력값을 확인해 주세요"); }

    @ExceptionHandler(DataAccessException.class)
    public ResponseEntity<AuthErrorResponse> unavailable() {
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                .body(new AuthErrorResponse("UNAVAILABLE", "저장소에 연결할 수 없어요. 잠시 후 다시 시도해 주세요"));
    }

    private ResponseEntity<AuthErrorResponse> badRequest(String message) {
        return ResponseEntity.badRequest().body(new AuthErrorResponse("INVALID_REQUEST", message));
    }
}
