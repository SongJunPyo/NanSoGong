-- ----------------------------------------------------------------------
-- ai_job: AI 작업 기준 기록 (Spring 이 시작 때 만들고, Python 보고로 갱신)
--   도메인: 제안·승인·실행 · 담당: 미정 (#34 ②)
--   - Spring 이 행을 먼저 만들고 ai_job_id 를 Python 에 jobId 로 넘긴다
--   - Python → Spring 보고 · 내부 호출의 매장 · 사용자는 이 행 기준으로 정한다 (요청 본문 값을 쓰지 않음)
--   - 보고 중복 · 순서: 들어온 seq 가 last_report_seq 와 같으면 무시, 작으면 거절, 크면 반영
--   - 취소(CANCELED) · 대체(SUPERSEDED)된 작업의 보고는 거절한다
--   - Python 작업 등록부 · LangGraph 체크포인트(ai 스키마)와 별개다. 업무 화면은 이 표만 본다
-- ----------------------------------------------------------------------
CREATE TABLE ai_job (
  ai_job_id               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  store_id                BIGINT NOT NULL REFERENCES store (store_id),
  requested_by_member_id  BIGINT REFERENCES member (member_id),
  job_type                VARCHAR(30) NOT NULL CHECK (job_type IN ('RECIPE_DRAFT', 'NEW_MENU_SUGGEST', 'PURCHASE_SUGGEST', 'PURCHASE_EXECUTE', 'COUPON_SUGGEST', 'OPERATIONS_ANALYSIS')),
  workflow_key            VARCHAR(64) NOT NULL,
  status                  VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'RUNNING', 'WAITING_AUTH', 'SUCCEEDED', 'FAILED', 'CANCELED', 'SUPERSEDED')),
  current_step            VARCHAR(50),
  last_report_seq         INTEGER NOT NULL DEFAULT 0 CHECK (last_report_seq >= 0),
  request_params          JSONB NOT NULL DEFAULT '{}',
  suggestion_id           BIGINT REFERENCES suggestion (suggestion_id),
  execution_id            BIGINT REFERENCES execution (execution_id),
  error_code              VARCHAR(50),
  error_msg               VARCHAR(500),
  langsmith_trace_id      VARCHAR(64),
  started_at              TIMESTAMPTZ,
  finished_at             TIMESTAMPTZ,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 같은 업무(workflow_key)는 진행 중인 작업이 하나만 있을 수 있다
CREATE UNIQUE INDEX uq_ai_job_active_workflow ON ai_job (workflow_key) WHERE status IN ('PENDING', 'RUNNING', 'WAITING_AUTH');
-- 매장별 최근 작업 조회
CREATE INDEX idx_ai_job_store_created ON ai_job (store_id, created_at DESC);

COMMENT ON TABLE ai_job IS 'AI 작업 기준 기록 (Spring 이 만들고 Python 보고로 갱신)';
COMMENT ON COLUMN ai_job.ai_job_id IS 'AI 작업 ID. Python 에 jobId 로 넘긴다';
COMMENT ON COLUMN ai_job.store_id IS '매장. Python 보고 · 내부 호출의 매장 기준';
COMMENT ON COLUMN ai_job.requested_by_member_id IS '작업을 요청한 사용자. 정기 작업이면 NULL';
COMMENT ON COLUMN ai_job.job_type IS 'RECIPE_DRAFT 레시피초안 / NEW_MENU_SUGGEST 신메뉴추천 / PURCHASE_SUGGEST 발주제안 / PURCHASE_EXECUTE 발주실행 / COUPON_SUGGEST 쿠폰제안 / OPERATIONS_ANALYSIS 운영분석';
COMMENT ON COLUMN ai_job.workflow_key IS '동일 업무의 안정적인 키 (suggestion.workflow_key 와 같은 값). 진행 중 작업은 키마다 하나';
COMMENT ON COLUMN ai_job.status IS 'PENDING 접수 / RUNNING 진행중 / WAITING_AUTH 사용자 인증 대기 / SUCCEEDED 완료 / FAILED 실패 / CANCELED 취소 / SUPERSEDED 대체됨';
COMMENT ON COLUMN ai_job.current_step IS 'Python 이 마지막으로 보고한 단계 이름. 예: VALIDATE, SAVE';
COMMENT ON COLUMN ai_job.last_report_seq IS '마지막으로 반영한 보고 순번. 같으면 중복으로 무시, 작으면 순서 역전으로 거절';
COMMENT ON COLUMN ai_job.request_params IS '작업 요청 조건 사본. 예: {"menuName":"딸기라떼"}. 키는 camelCase, 비밀값 · 개인정보는 넣지 않음';
COMMENT ON COLUMN ai_job.suggestion_id IS '작업 결과로 저장된 제안 버전. 제안을 만들지 않은 작업은 NULL';
COMMENT ON COLUMN ai_job.execution_id IS '실행 작업(PURCHASE_EXECUTE)이 처리한 외부 실행. 다른 작업은 NULL';
COMMENT ON COLUMN ai_job.error_code IS '실패 코드. 예: VALIDATION_FAILED, GENERATION_FAILED';
COMMENT ON COLUMN ai_job.error_msg IS '사용자 안내 오류';
COMMENT ON COLUMN ai_job.langsmith_trace_id IS 'AI 추적 연결값. 서비스 원본이나 FK가 아님';
COMMENT ON COLUMN ai_job.started_at IS 'Python 이 처리를 시작한 시각';
COMMENT ON COLUMN ai_job.finished_at IS '완료 · 실패 · 취소 · 대체로 끝난 시각';
COMMENT ON COLUMN ai_job.created_at IS '생성 시각';
COMMENT ON COLUMN ai_job.updated_at IS '수정 시각 (앱에서 갱신)';
