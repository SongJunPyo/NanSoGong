"""표준 출력 JSON 로그 (#36).

한 줄에 하나씩 JSON 으로 찍는다 → docker logs · CloudWatch 에서 jobId · traceId 로 찾을 수 있다.

    {"time": "...", "level": "INFO", "logger": "app.jobs.worker", "message": "...", "jobId": 7, "traceId": "..."}

- jobId · traceId 는 log_context() 로 묶은 구간에서 자동으로 붙는다 (워커가 작업 하나를 처리하는 동안).
  logger.info(..., extra={"job_id": 7}) 처럼 한 줄에만 붙일 수도 있다.
- 🚨 비밀값 · 개인정보를 로그에 넣지 않는다 (docs/rules/ai.md 인증 · 입력 데이터). 설정의 비밀값은 SecretStr 라 찍혀도 가려진다.
"""

import json
import logging
import sys
from collections.abc import Iterator
from contextlib import contextmanager
from contextvars import ContextVar
from datetime import UTC, datetime

_job_id: ContextVar[int | None] = ContextVar("log_job_id", default=None)
_trace_id: ContextVar[str | None] = ContextVar("log_trace_id", default=None)

# uvicorn 이 따로 만드는 로거. 핸들러를 떼고 루트(JSON)로 올려 보낸다
_UVICORN_LOGGERS = ("uvicorn", "uvicorn.error", "uvicorn.access")


@contextmanager
def log_context(job_id: int | None = None, trace_id: str | None = None) -> Iterator[None]:
    """이 구간에서 찍는 로그에 jobId · traceId 를 붙인다."""
    job_token = _job_id.set(job_id)
    trace_token = _trace_id.set(trace_id)
    try:
        yield
    finally:
        _trace_id.reset(trace_token)
        _job_id.reset(job_token)


class JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        entry: dict[str, object] = {
            "time": datetime.fromtimestamp(record.created, UTC).isoformat(timespec="milliseconds"),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }
        job_id = getattr(record, "job_id", None) or _job_id.get()
        trace_id = getattr(record, "trace_id", None) or _trace_id.get()
        if job_id is not None:
            entry["jobId"] = job_id
        if trace_id is not None:
            entry["traceId"] = trace_id
        if record.exc_info:
            entry["exception"] = self.formatException(record.exc_info)
        return json.dumps(entry, ensure_ascii=False, default=str)


def configure_logging(level: int = logging.INFO) -> None:
    """루트 로거를 표준 출력 JSON 한 줄 로그로 바꾼다. 여러 번 불러도 핸들러는 하나다."""
    # 로그는 항상 UTF-8 (Windows 에서 직접 실행하면 표준 출력이 cp949 라 한글이 깨진다. 컨테이너는 원래 UTF-8)
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(JsonFormatter())
    root = logging.getLogger()
    root.handlers[:] = [handler]
    root.setLevel(level)
    for name in _UVICORN_LOGGERS:
        uvicorn_logger = logging.getLogger(name)
        uvicorn_logger.handlers.clear()
        uvicorn_logger.propagate = True
