package com.nansogong.dto;

/** 로그인 응답: 이후 요청마다 헤더에 "Authorization: Bearer {accessToken}" 으로 보낸다 */
public record TokenResponse(
        String accessToken,
        String tokenType,
        long expiresIn      // 몇 초 뒤 만료되는지
) {
    public static TokenResponse bearer(String accessToken, long expiresInSeconds) {
        return new TokenResponse(accessToken, "Bearer", expiresInSeconds);
    }
}
