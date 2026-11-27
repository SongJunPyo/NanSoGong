package com.nansogong.dto;

public record AuthPhoneConfirmationResponse(String verificationToken, long expiresAt, String phone, String name) {}
