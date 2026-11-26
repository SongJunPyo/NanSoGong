package com.nansogong.service;

import com.nansogong.common.AppProperties;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.dao.DataAccessException;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpMethod;
import org.springframework.security.web.servlet.util.matcher.PathPatternRequestMatcher;
import org.springframework.security.web.util.matcher.RequestMatcher;

import java.io.IOException;

/** 쿠키를 쓰는 인증 API 전용. 세션에 묶인 예측 불가능한 헤더 + 허용 Origin을 확인한다. */
public class AuthSessionCsrfFilter extends OncePerRequestFilter {
    private final RequestMatcher login = PathPatternRequestMatcher.withDefaults().matcher(HttpMethod.POST, "/api/auth/login");
    private final RequestMatcher cookieMutation = PathPatternRequestMatcher.withDefaults().matcher(HttpMethod.POST, "/api/auth/{operation:refresh|logout}");
    private final AppProperties props;
    private final AuthCookieService cookies;
    private final AuthSessionService sessions;
    public AuthSessionCsrfFilter(AppProperties props, AuthCookieService cookies, AuthSessionService sessions) {
        this.props = props; this.cookies = cookies; this.sessions = sessions;
    }
    @Override protected boolean shouldNotFilter(HttpServletRequest request) {
        return !login.matches(request) && !cookieMutation.matches(request);
    }
    @Override protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain) throws ServletException, IOException {
        try {
            String origin = request.getHeader("Origin");
            if ((origin != null && !props.cors().allowedOrigins().contains(origin))
                    || !"1".equals(request.getHeader("X-Nansogong-Auth"))) {
                reject(response, 403); return;
            }
            if (!login.matches(request)) sessions.checkCsrf(cookies.read(request), request.getHeader("X-CSRF-Token"));
            chain.doFilter(request, response);
        } catch (ResponseStatusException failure) {
            if (failure.getStatusCode().value() == 401) cookies.clear(response);
            reject(response, failure.getStatusCode().value());
        } catch (DataAccessException unavailable) { reject(response, 503); }
    }
    private void reject(HttpServletResponse response, int status) throws IOException {
        response.setStatus(status); response.setContentType("application/json;charset=UTF-8");
        cookies.noStore(response);
        String message = status == 503 ? "인증 서버에 연결할 수 없어요. 잠시 후 다시 시도해 주세요" : status == 401 ? "로그인이 만료되었거나 종료됐어요. 다시 로그인해 주세요" : "요청의 보안 정보를 확인할 수 없어요. 새로고침 후 다시 시도해 주세요";
        response.getWriter().write("{\"code\":\"AUTH_REQUEST_REJECTED\",\"message\":\"" + message + "\"}");
    }
}
