"""Spring → Python 작업 API (#34 ⑥ 작업 방식). 내부 토큰(X-Internal-Token)이 있어야 부를 수 있다.

    POST /jobs                  접수. 새로 받으면 202, 같은 jobId · 같은 내용이면 기존 작업 200, 내용이 다르면 409
    GET  /jobs/{jobId}          조회 (Spring 이 대조 · 복구할 때)
    POST /jobs/{jobId}/cancel   취소. 처리 중이면 워커가 다음 단계 전에 멈춘다

접수만 하고 바로 돌려준다. 실제 처리는 워커가 하고, 진행 · 결과는 Python 이 Spring 에 보고한다.
화면은 이 API 를 보지 않는다 (화면은 Spring ai_job 만 본다).
"""

from typing import Annotated

from fastapi import APIRouter, Depends, Request, Response, status
from pydantic import ValidationError

from app.errors import AppError
from app.jobs.handlers import JOB_INPUTS
from app.jobs.registry import JobConflict, JobRecord, JobRegistry
from app.models.job import JobAccept, JobView
from app.security import require_internal_token

router = APIRouter(prefix="/jobs", tags=["작업"], dependencies=[Depends(require_internal_token)])


def get_registry(request: Request) -> JobRegistry:
    registry = getattr(request.app.state, "job_registry", None)
    if registry is None:
        raise AppError(503, "JOB_STORE_NOT_CONFIGURED", "작업 저장소가 설정되지 않았습니다")
    return registry


Registry = Annotated[JobRegistry, Depends(get_registry)]


def _view(record: JobRecord) -> JobView:
    return JobView.model_validate(record, from_attributes=True)


def _not_found() -> AppError:
    return AppError(404, "JOB_NOT_FOUND", "작업을 찾을 수 없습니다")


@router.post("", status_code=status.HTTP_202_ACCEPTED, response_model=JobView)
def accept_job(body: JobAccept, response: Response, registry: Registry) -> JobView:
    input_model = JOB_INPUTS.get(body.job_type)
    if input_model is None:
        raise AppError(400, "UNSUPPORTED_JOB_TYPE", "아직 지원하지 않는 작업 종류입니다")
    try:
        job_input = input_model.model_validate(body.input)
    except ValidationError:
        # 어떤 값이 틀렸는지는 돌려주지 않는다 (입력 값이 응답 · 로그에 남지 않게)
        raise AppError(400, "INVALID_JOB_INPUT", "작업 입력이 작업 종류에 맞지 않습니다") from None

    # 저장 · 비교는 정리한 입력으로 한다 (camelCase, 모르는 칸 제외)
    normalized = body.model_copy(update={"input": job_input.model_dump(mode="json")})
    try:
        record, created = registry.accept(normalized)
    except JobConflict:
        raise AppError(409, "JOB_CONFLICT", "같은 jobId 로 다른 내용의 작업이 이미 접수돼 있습니다") from None
    if not created:
        response.status_code = status.HTTP_200_OK
    return _view(record)


@router.get("/{job_id}", response_model=JobView)
def get_job(job_id: int, registry: Registry) -> JobView:
    record = registry.get(job_id)
    if record is None:
        raise _not_found()
    return _view(record)


@router.post("/{job_id}/cancel", response_model=JobView)
def cancel_job(job_id: int, registry: Registry) -> JobView:
    record = registry.cancel(job_id)
    if record is None:
        raise _not_found()
    return _view(record)
