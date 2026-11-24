package com.nansogong.dto;

import com.nansogong.model.Member;
import com.nansogong.model.MemberStatus;

/** 회원 정보 응답. 비밀번호 해시는 절대 내보내지 않는다 */
public record MemberResponse(
        Long id,
        String loginId,
        String name,
        String phone,
        MemberStatus status
) {
    public static MemberResponse from(Member member) {
        return new MemberResponse(member.getId(), member.getLoginId(), member.getName(), member.getPhone(), member.getStatus());
    }
}
