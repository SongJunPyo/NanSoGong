-- ----------------------------------------------------------------------
-- 작업 등록부: 워커가 일을 받아 가는 장부 (#36)
--   AI 작업의 기준 기록은 Spring ai_job 이다. 여기에는 워커 내부 진행(접수 · 선점 · 기한 · 보고 전달)만 둔다
--   ai 스키마에 만든다 (연결의 search_path = ai, app/db/pool.py). 스키마 · 계정은 인프라 초기화 스크립트가 만든다
--   이미 적용된 파일은 고치지 않는다. 바꿀 내용은 다음 번호 파일로 만든다 (app/db/migrate.py)
-- ----------------------------------------------------------------------
CREATE TABLE job (
  job_id            BIGINT PRIMARY KEY,                 -- Spring ai_job.ai_job_id 그대로. Python 이 만들지 않는다
  job_type          VARCHAR(30) NOT NULL,               -- Spring ai_job.job_type 과 같은 값
  workflow_key      VARCHAR(64) NOT NULL,
  input             JSONB NOT NULL DEFAULT '{}',        -- 접수 입력. 예: {"menuName":"딸기라떼"}. 비밀값 · 개인정보는 넣지 않는다
  status            VARCHAR(20) NOT NULL DEFAULT 'PENDING'
                    CHECK (status IN ('PENDING', 'RUNNING', 'SUCCEEDED', 'FAILED', 'CANCELED')),
  attempts          INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),   -- 선점 횟수. 한도는 코드(MAX_ATTEMPTS)
  lease_owner       VARCHAR(64),                        -- 처리 중인 워커
  lease_expires_at  TIMESTAMPTZ,                        -- 지나면 다른 워커가 회수한다 (워커가 죽었거나 재시도 대기)
  cancel_requested  BOOLEAN NOT NULL DEFAULT false,     -- 진행 중 취소 요청. 워커가 단계 사이에서 멈춘다
  error_code        VARCHAR(50),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at       TIMESTAMPTZ,
  -- 진행 중이면 finished_at 이 비어 있고, 끝났으면 채워져 있다 (Spring ai_job 과 같은 규칙)
  CHECK ((status IN ('PENDING', 'RUNNING')) = (finished_at IS NULL)),
  -- 처리 중인 작업에는 처리하는 워커와 기한이 있다
  CHECK (status <> 'RUNNING' OR (lease_owner IS NOT NULL AND lease_expires_at IS NOT NULL)),
  CHECK (status <> 'FAILED' OR error_code IS NOT NULL)
);

-- 워커가 받아 갈 작업 찾기 (먼저 들어온 순서)
CREATE INDEX idx_job_active ON job (created_at) WHERE status IN ('PENDING', 'RUNNING');

-- ----------------------------------------------------------------------
-- 보고 편지함: Spring POST /internal/ai-jobs/{jobId}/reports 로 보낼 보고
--   먼저 여기에 쓰고, 작업마다 seq 순서대로 보낸다. 보내기에 실패하면 남아 있다가 다시 보낸다
--   seq 는 Spring ai_job.last_report_seq 와 비교하는 순번이다 (같으면 중복 무시, 작으면 거절)
-- ----------------------------------------------------------------------
CREATE TABLE job_report (
  job_id              BIGINT NOT NULL REFERENCES job (job_id),
  seq                 INTEGER NOT NULL CHECK (seq > 0),
  step                VARCHAR(50) NOT NULL,             -- 예: LOAD_CONTEXT, VALIDATE, SAVE
  status              VARCHAR(20) NOT NULL CHECK (status IN ('RUNNING', 'SUCCEEDED', 'FAILED')),
  error_code          VARCHAR(50),
  suggestion_id       BIGINT,
  langsmith_trace_id  VARCHAR(64),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_at             TIMESTAMPTZ,                      -- 비어 있으면 아직 보내지 못한 보고
  PRIMARY KEY (job_id, seq),
  CHECK (status <> 'FAILED' OR error_code IS NOT NULL)
);

-- 아직 보내지 못한 보고 찾기
CREATE INDEX idx_job_report_unsent ON job_report (job_id, seq) WHERE sent_at IS NULL;
