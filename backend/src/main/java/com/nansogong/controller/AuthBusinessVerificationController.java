package com.nansogong.controller;

import com.nansogong.dto.AuthBusinessVerificationErrorResponse;
import com.nansogong.dto.AuthBusinessVerificationRequest;
import com.nansogong.dto.AuthBusinessVerificationResponse;
import com.nansogong.service.AuthBusinessVerificationService;
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

/** 가입 전 단건 진위확인. API 계약은 POST {bizRegNo, ownerName, openingDate} → {bizRegNo, status}다. */
@RestController
@RequestMapping("/api/auth/business-verifications")
@RequiredArgsConstructor
public class AuthBusinessVerificationController {

    private final AuthBusinessVerificationService verificationService;

    @Operation(summary = "국세청 사업자 진위확인", description = "사업자번호·대표자명·개업일자의 일치 여부와 영업 상태를 확인합니다. 회원·매장을 저장하지 않습니다.")
    @PostMapping
    public AuthBusinessVerificationResponse verify(@Valid @RequestBody AuthBusinessVerificationRequest request) {
        return verificationService.verify(request);
    }

    // 공용 예외 처리 구현 전에는 기존 인증 API와 같은 예외를 쓰고, 이 Controller에서만 변환한다.
    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<AuthBusinessVerificationErrorResponse> handleVerificationFailure(ResponseStatusException exception) {
        String code = switch (exception.getStatusCode().value()) {
            case 400 -> "INVALID_BUSINESS_INFORMATION";
            case 503 -> "NTS_UNAVAILABLE";
            default -> "NTS_INVALID_RESPONSE";
        };
        return ResponseEntity.status(exception.getStatusCode())
                .body(new AuthBusinessVerificationErrorResponse(code, exception.getReason()));
    }

    @ExceptionHandler({MethodArgumentNotValidException.class, HttpMessageNotReadableException.class})
    public ResponseEntity<AuthBusinessVerificationErrorResponse> handleInvalidRequest() {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(new AuthBusinessVerificationErrorResponse("INVALID_BUSINESS_INFORMATION",
                        "사업자등록번호 숫자 10자리, 대표자명, 개업일자 YYYYMMDD를 확인해 주세요"));
    }
}
