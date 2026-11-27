package com.nansogong.service;

import com.nansogong.common.AppProperties;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;

@Service
@RequiredArgsConstructor
public class AuthCookieService {
    public static final String NAME = "nansogong-refresh";
    private final AppProperties props;
    public String read(HttpServletRequest request) {
        if (request.getCookies() == null) return null;
        String token = null;
        for (var cookie : request.getCookies()) if (NAME.equals(cookie.getName())) {
            if (token != null) return null; // 같은 이름의 쿠키가 둘이면 모호한 인증을 거절한다.
            token = cookie.getValue();
        }
        return token;
    }
    public void write(HttpServletResponse response, AuthSessionService.IssuedSession session) {
        var cookie = base(session.refreshToken());
        if (session.remember()) cookie.maxAge(Duration.between(Instant.now(), session.expiresAt()));
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.build().toString());
        noStore(response);
    }
    public void clear(HttpServletResponse response) {
        response.addHeader(HttpHeaders.SET_COOKIE, base("").maxAge(Duration.ZERO).build().toString());
        noStore(response);
    }
    public void noStore(HttpServletResponse response) { response.setHeader(HttpHeaders.CACHE_CONTROL, "no-store"); }
    private ResponseCookie.ResponseCookieBuilder base(String value) {
        return ResponseCookie.from(NAME, value).httpOnly(true).secure(props.session().cookieSecure())
                .sameSite(props.session().cookieSameSite()).path("/api/auth"); // Domain 없이 호스트 범위만 사용
    }
}
