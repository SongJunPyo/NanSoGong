"""AI 작업 접수 · 보고 (Spring ↔ Python, #34 ② · ⑥, #35 4)).

- Spring → Python: POST /jobs 로 작업을 넘긴다 (JobAccept). jobId 는 Spring ai_job.ai_job_id 다.
- Python → Spring: POST /internal/ai-jobs/{jobId}/reports 로 진행 · 결과를 알린다 (JobReport).
  Spring 은 seq 를 ai_job.last_report_seq 와 비교해 중복 · 순서 역전을 거른다.
"""

from datetime import datetime
from enum import StrEnum
from typing import Any

from pydantic import Field

from app.models.base import CamelModel


class JobType(StrEnum):
    """Spring ai_job.job_type 과 같은 값."""

    RECIPE_DRAFT = "RECIPE_DRAFT"
    NEW_MENU_SUGGEST = "NEW_MENU_SUGGEST"
    PURCHASE_SUGGEST = "PURCHASE_SUGGEST"
    PURCHASE_EXECUTE = "PURCHASE_EXECUTE"
    COUPON_SUGGEST = "COUPON_SUGGEST"
    OPERATIONS_ANALYSIS = "OPERATIONS_ANALYSIS"


class JobStatus(StrEnum):
    """Python 작업 등록부의 상태. 이름은 Spring ai_job 과 같은 것만 쓴다."""

    PENDING = "PENDING"                         # 접수됨. 워커가 아직 받지 않음
    RUNNING = "RUNNING"                         # 워커가 처리 중 (또는 재시도 대기)
    SUCCEEDED = "SUCCEEDED"
    FAILED = "FAILED"
    CANCELED = "CANCELED"


ACTIVE_STATUSES = (JobStatus.PENDING, JobStatus.RUNNING)


class JobErrorCode(StrEnum):
    """작업 실패 코드 (Spring ai_job.error_code 로 보고된다)."""

    VALIDATION_FAILED = "VALIDATION_FAILED"     # 수정 한도까지 고쳐도 Spring 검증 실패
    GENERATION_FAILED = "GENERATION_FAILED"     # LLM 이 형식에 맞는 결과를 주지 못함
    RETRY_EXHAUSTED = "RETRY_EXHAUSTED"         # 오류 · 워커 중단이 반복돼 시도 한도(MAX_ATTEMPTS)를 다 씀


class ReportStatus(StrEnum):
    RUNNING = "RUNNING"
    SUCCEEDED = "SUCCEEDED"
    FAILED = "FAILED"


class JobAccept(CamelModel):
    """POST /jobs 요청. input 의 모양은 작업 종류마다 다르다 (app/jobs/handlers.py JOB_INPUTS)."""

    job_id: int = Field(gt=0)
    job_type: JobType
    workflow_key: str = Field(min_length=1, max_length=64)
    input: dict[str, Any] = {}


class JobView(CamelModel):
    """작업 조회 응답. 화면은 이 값을 보지 않는다 (화면은 Spring ai_job 만 본다)."""

    job_id: int
    job_type: JobType
    workflow_key: str
    status: JobStatus
    attempts: int                               # 워커가 받아 간 횟수
    cancel_requested: bool
    error_code: str | None = None
    created_at: datetime
    updated_at: datetime
    finished_at: datetime | None = None


class JobReport(CamelModel):
    """POST /internal/ai-jobs/{jobId}/reports 요청."""

    seq: int = Field(gt=0)
    step: str                                   # 지금 하고 있는(끝나면 마지막) 단계. 예: VALIDATE
    status: ReportStatus
    error_code: str | None = None
    suggestion_id: int | None = None
    langsmith_trace_id: str | None = None
