package com.nansogong.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;

/** 사장님 계정 (member 표). lock_settings 칸은 아직 쓰지 않아 매핑하지 않았다. */
@Entity
@Table(name = "member")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Member {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "member_id")
    private Long id;

    @Column(nullable = false, unique = true, length = 50)
    private String loginId;

    @Column(nullable = false)
    private String passwordHash;

    @Column(nullable = false, length = 50)
    private String name;

    @Column(nullable = false, length = 20)
    private String phone;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private MemberStatus status;

    @Column(nullable = false)
    private Instant phoneVerifiedAt;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(nullable = false)
    private Instant updatedAt;

    /** 내부 데모 생성용. 실제 가입 API는 서버가 확인한 인증 시각을 받는 오버로드를 쓴다. */
    public static Member create(String loginId, String passwordHash, String name, String phone) {
        return create(loginId, passwordHash, name, phone, Instant.now());
    }

    public static Member create(String loginId, String passwordHash, String name, String phone, Instant phoneVerifiedAt) {
        Member member = new Member();
        member.loginId = loginId;
        member.passwordHash = passwordHash;
        member.name = name;
        member.phone = phone;
        member.status = MemberStatus.ACTIVE;
        member.phoneVerifiedAt = phoneVerifiedAt;
        return member;
    }
}
