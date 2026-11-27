package com.nansogong.common;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.List;

/**
 * Python AI 워커 → Spring 내부 API(/internal/**) 인증 (#34 ③).
 * X-Internal-Token 을 app.internal.token (환경변수 INTERNAL_API_TOKEN) 과 비교한다.
 * 환경변수에 SPRING_ 접두사를 쓰지 않는다: Spring 이 spring.* 설정으로 읽으려 해서 헷갈린다.
 * - 토큰이 설정되지 않은 서버는 내부 API 를 모두 401 (빈 값끼리 일치하는 일을 막는다)
 * - MessageDigest.isEqual: 비교 시간으로 토큰을 한 글자씩 알아내는 공격을 막는다 (상수 시간 비교)
 * - 토큰 값은 로그에 남기지 않는다
 */
public class InternalTokenFilter extends OncePerRequestFilter {

    public static final String HEADER = "X-Internal-Token";

    private final byte[] expected;

    public InternalTokenFilter(String expectedToken) {
        this.expected = expectedToken == null ? new byte[0] : expectedToken.getBytes(StandardCharsets.UTF_8);
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        String token = request.getHeader(HEADER);
        if (expected.length == 0 || token == null || !MessageDigest.isEqual(token.getBytes(StandardCharsets.UTF_8), expected)) {
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.setContentType("application/json;charset=UTF-8");
            response.getWriter().write("{\"code\":\"INVALID_INTERNAL_TOKEN\",\"message\":\"내부 인증 토큰이 없거나 올바르지 않습니다\"}");
            return;
        }
        var auth = UsernamePasswordAuthenticationToken.authenticated("ai-worker", null, List.of(new SimpleGrantedAuthority("ROLE_INTERNAL")));
        var context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(auth);
        SecurityContextHolder.setContext(context);
        try {
            chain.doFilter(request, response);
        } finally {
            SecurityContextHolder.clearContext();
        }
    }
}
