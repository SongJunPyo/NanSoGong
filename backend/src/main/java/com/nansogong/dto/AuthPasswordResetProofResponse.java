package com.nansogong.dto;

public record AuthPasswordResetProofResponse(String resetToken, long expiresAt) {}
