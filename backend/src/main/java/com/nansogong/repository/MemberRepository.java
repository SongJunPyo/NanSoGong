package com.nansogong.repository;

import com.nansogong.model.Member;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface MemberRepository extends JpaRepository<Member, Long> {

    /** 로그인할 때 아이디로 회원 찾기 */
    Optional<Member> findByLoginId(String loginId);

    /** 가입할 때 아이디 중복 확인 */
    boolean existsByLoginId(String loginId);
}
