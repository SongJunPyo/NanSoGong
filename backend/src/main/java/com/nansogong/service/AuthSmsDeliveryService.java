package com.nansogong.service;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

/** 업체 미선정·자격 미준비·발송 오류는 실제 인증 실패다. 개발용 성공으로 대체하지 않는다. */
@Service
@RequiredArgsConstructor
public class AuthSmsDeliveryService {
    private final ObjectProvider<AuthSmsSender> senders;

    public boolean available() {
        AuthSmsSender sender = senders.getIfAvailable();
        return sender != null && sender.isConfigured();
    }
    public void requireAvailable() {
        if (!available()) throw unavailable();
    }
    public void send(String phone, String code) {
        requireAvailable();
        try { senders.getObject().send(phone, code); }
        catch (RuntimeException failure) { throw unavailable(); }
    }
    private ResponseStatusException unavailable() {
        return new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "SMS 발송 업체와 인증 설정이 준비되지 않았거나 문자 발송에 실패했어요. 잠시 후 다시 시도해 주세요");
    }
}
