package com.nansogong.service;

/** 선정한 SMS 업체의 공식 API 어댑터만 구현한다. 테스트 대역은 테스트 설정에만 등록한다. */
public interface AuthSmsSender {
    boolean isConfigured();
    void send(String phone, String code);
}
