package com.nansogong.model;

/** 회원 상태. DB member.status 의 CHECK 값과 같아야 한다. */
public enum MemberStatus {
    ACTIVE,     // 활성
    LOCKED,     // 잠김
    WITHDRAWN   // 탈퇴
}
