package com.nansogong.repository;

import com.nansogong.model.AgentJob;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface AgentJobRepository extends JpaRepository<AgentJob, Long> {

    /**
     * 작업 행을 잠그고 가져온다 (SELECT ... FOR UPDATE).
     * 같은 작업의 보고 · 제안 저장이 동시에 와도 순번 비교와 갱신이 한 번에 하나씩만 일어난다 (db.md "조건부 갱신"과 같은 효과).
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select j from AgentJob j where j.id = :jobId")
    Optional<AgentJob> findByIdForUpdate(@Param("jobId") Long jobId);
}
