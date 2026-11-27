package com.nansogong.repository;

import com.nansogong.model.Suggestion;
import com.nansogong.model.SuggestionStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface SuggestionRepository extends JpaRepository<Suggestion, Long> {

    /** 같은 업무의 가장 최신 버전 */
    Optional<Suggestion> findFirstByStoreIdAndWorkflowKeyOrderByVersionDesc(Long storeId, String workflowKey);

    /** 같은 업무에서 아직 결정 전인 버전들 (새 버전이 생기면 대체됨 처리) */
    List<Suggestion> findByStoreIdAndWorkflowKeyAndStatusIn(Long storeId, String workflowKey, Collection<SuggestionStatus> statuses);
}
