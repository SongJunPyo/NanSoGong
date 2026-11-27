package com.nansogong.controller;

import com.nansogong.dto.AuthBusinessStatusErrorResponse;
import com.nansogong.dto.AuthBusinessStatusRequest;
import com.nansogong.dto.AuthBusinessStatusResponse;
import com.nansogong.service.AuthBusinessStatusService;
import io.swagger.v3.oas.annotations.Operation;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

/** 가입 전 상태조회용 API. 기존 회원가입·매장 등록의 허용 조건을 변경하지 않는다. */
@RestController
@RequestMapping("/api/auth/business-status")
@RequiredArgsConstructor
public class AuthBusinessStatusController {

    private final AuthBusinessStatusService businessStatusService;

    // 프론트와의 연결 전 임시 계약: POST {bizRegNo} → {bizRegNo, status}.
    @Operation(summary = "국세청 사업자 상태조회", description = "영업·휴업·폐업·미등록을 조회합니다. 사업자 진위확인은 수행하지 않습니다.")
    @PostMapping
    public AuthBusinessStatusResponse lookup(@Valid @RequestBody AuthBusinessStatusRequest request) {
        return businessStatusService.lookup(request.bizRegNo());
    }

    // 공용 BusinessException·GlobalExceptionHandler가 아직 없어 기존 AuthService와 같은 예외를 사용한다.
    // 오류 변환은 이 Controller에만 적용하며 원본 국세청 응답·인증키는 반환하지 않는다.
    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<AuthBusinessStatusErrorResponse> handleLookupFailure(ResponseStatusException exception) {
        String code = exception.getStatusCode().value() == 503 ? "NTS_UNAVAILABLE" : "NTS_INVALID_RESPONSE";
        return ResponseEntity.status(exception.getStatusCode())
                .body(new AuthBusinessStatusErrorResponse(code, exception.getReason()));
    }

    @ExceptionHandler({MethodArgumentNotValidException.class, HttpMessageNotReadableException.class})
    public ResponseEntity<AuthBusinessStatusErrorResponse> handleInvalidRequest() {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(new AuthBusinessStatusErrorResponse("INVALID_BUSINESS_NUMBER", "사업자등록번호는 숫자 10자리로 입력해 주세요"));
    }
}
