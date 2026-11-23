/**
 * 담당: 소정 · 유저 플로우: UF-01, UF-02
 * <p>
 * 요구사항: 구현-1-1 회원가입, 1-3 로그인·로그아웃(JWT access/refresh), 1-4 비밀번호 재설정, 1-5 회원 정보, 7-1 접근 제어, 7-2 민감 정보 PIN 잠금
 * <p>
 * 개발 메모: 휴대폰 본인인증은 app.verification.mode=mock 이면 인증번호 000000. refresh 토큰은 Redis 에 저장하고 로그아웃 때 삭제
 * <p>
 * 이 패키지 안에서 controller · service · repository · domain · dto 로 나눈다. 다른 담당 패키지의 표를 직접 수정하지 말고 그 패키지의 service 를 부른다.
 */
package com.nansogong.auth;
