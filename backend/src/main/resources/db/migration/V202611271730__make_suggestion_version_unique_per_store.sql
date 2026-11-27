-- 제안 버전 번호를 매장마다 따로 센다 (PR #56 리뷰 1).
-- 예전 제약 UNIQUE (workflow_key, version) 은 매장 구분이 없어서, 두 매장이 같은 workflow_key 를 쓰면 둘째 매장의 version 1 저장이 막혔다.
-- 제약을 넓히는 변경이라 기존 데이터는 그대로 통과한다.
ALTER TABLE suggestion DROP CONSTRAINT suggestion_workflow_key_version_key;
ALTER TABLE suggestion ADD CONSTRAINT uq_suggestion_store_workflow_version UNIQUE (store_id, workflow_key, version);
COMMENT ON COLUMN suggestion.workflow_key IS '동일 업무의 안정적인 키 (store_id · version 과 묶어서 UQ)';
