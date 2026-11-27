package com.nansogong.repository;

import com.nansogong.model.Member;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.Lock;
import jakarta.persistence.LockModeType;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface MemberRepository extends JpaRepository<Member, Long> {

    /** 로그인할 때 아이디로 회원 찾기 */
    Optional<Member> findByLoginId(String loginId);

    /** 가입할 때 아이디 중복 확인 */
    boolean existsByLoginId(String loginId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select member from Member member where member.id = :id")
    Optional<Member> findForPasswordReset(@Param("id") Long id);

    /** 가입 트랜잭션 안에서 같은 아이디의 동시 생성을 순서대로 처리한다. */
    @Query(value = "SELECT 1 FROM pg_advisory_xact_lock(1, hashtext(:loginId))", nativeQuery = true)
    Integer lockRegistration(@Param("loginId") String loginId);
}
