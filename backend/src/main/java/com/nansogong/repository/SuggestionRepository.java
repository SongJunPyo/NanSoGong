package com.nansogong.repository;

import com.nansogong.model.Suggestion;
import com.nansogong.model.SuggestionStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface SuggestionRepository extends JpaRepository<Suggestion, Long> {

    /**
     * 같은 매장 · 업무 키의 제안 저장을 한 번에 하나씩 하도록 잠근다 (트랜잭션이 끝나면 저절로 풀림).
     * 행 잠금(FOR UPDATE)은 첫 버전처럼 잠글 행이 없을 때 막지 못해서 advisory lock 을 쓴다.
     * pg_advisory_xact_lock 은 void 를 돌려줘서 바깥에서 1 을 고른다.
     */
    @Query(value = "SELECT 1 FROM (SELECT pg_advisory_xact_lock(hashtextextended(CAST(:storeId AS text) || ':' || :workflowKey, 0))) AS l",
            nativeQuery = true)
    Integer lockWorkflow(@Param("storeId") Long storeId, @Param("workflowKey") String workflowKey);

    /** 같은 업무의 가장 최신 버전 */
    Optional<Suggestion> findFirstByStoreIdAndWorkflowKeyOrderByVersionDesc(Long storeId, String workflowKey);

    /** 같은 업무에서 아직 결정 전인 버전들 (새 버전이 생기면 대체됨 처리) */
    List<Suggestion> findByStoreIdAndWorkflowKeyAndStatusIn(Long storeId, String workflowKey, Collection<SuggestionStatus> statuses);
}
