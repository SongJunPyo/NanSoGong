"""워커 실행 명령: 작업 등록부에서 작업을 받아 처리한다 (#36).

    python -m app.worker

- API 서버(app.main)와 같은 이미지 · 다른 프로세스로 띄운다 (ai-api · ai-worker).
- 필요한 환경변수: AI_DATABASE_URL · SPRING_BASE_URL · INTERNAL_API_TOKEN · ANTHROPIC_API_KEY (AI_MODEL 은 선택)
  LangSmith 추적을 켜면(LANGSMITH_TRACING=true) LANGSMITH_API_KEY 도 필요하다.
  하나라도 없으면 이름만 알려 주고 바로 끝낸다 (값은 출력하지 않는다).
- 로그는 표준 출력 JSON 한 줄씩 (app/logs.py). 작업을 처리하는 동안은 jobId · traceId 가 붙는다.
- 표는 만들지 않는다. 배포할 때 python -m app.db.migrate 를 먼저 돌린다.
- 종료 신호(SIGTERM · Ctrl+C)를 받으면 지금 작업을 끝낸 뒤 멈춘다.
"""

import logging
import os
import signal
import socket
import threading
from collections.abc import Callable

from langchain_anthropic import ChatAnthropic
from langgraph.checkpoint.postgres import PostgresSaver

from app.clients.spring_http import HttpSpringClient
from app.config import Settings, get_settings
from app.db.pool import make_pool
from app.graphs.recipe import ClaudeDraftWriter
from app.jobs.handlers import RecipeDraftHandler
from app.jobs.registry import JobRegistry
from app.jobs.worker import Worker
from app.logs import configure_logging
from app.models.job import JobType
from app.tracing import tracing_from_settings

logger = logging.getLogger(__name__)

IDLE_SECONDS = 1.0                              # 받을 작업이 없을 때 기다리는 시간
ERROR_SECONDS = 5.0                             # DB 연결 실패 등 예상 못 한 오류 뒤 기다리는 시간
MODEL_TIMEOUT_SECONDS = 60.0                    # Claude 요청 한 번의 제한 시간
MODEL_MAX_RETRIES = 2                           # SDK 가 다시 시도하는 횟수 (시간 초과 · 429 · 5xx · 연결 오류)
MODEL_MAX_TOKENS = 16000
# 다시 시도하기 전에 SDK 가 기다리는 시간: 보통 최대 8초, 서버가 retry-after 를 주면 그만큼 기다린다
# 🚨 가정: retry-after 는 60초를 넘지 않는다 (분 단위 사용 한도). SDK 는 이 값에 상한을 두지 않는다
SDK_BACKOFF_MAX_SECONDS = 8.0
RETRY_AFTER_MAX_SECONDS = 60.0


def model_call_worst_seconds() -> float:
    """Claude 호출 한 번(SDK 재시도 포함)이 가장 오래 걸리는 시간(초). 지금 값으로 196초.

    다시 시도하기 전의 시도 하나는 둘 중 하나다
    - 시간 초과: 제한 시간 + 최대 8초 대기
    - 오류 응답(429 등)이 바로 옴: retry-after 만큼 대기
    작업 기한(app.jobs.worker.LEASE)보다 넉넉히 짧아야 한다 (tests/test_worker_main.py 가 확인).
    """
    one_retry = max(MODEL_TIMEOUT_SECONDS + SDK_BACKOFF_MAX_SECONDS, RETRY_AFTER_MAX_SECONDS)
    return one_retry * MODEL_MAX_RETRIES + MODEL_TIMEOUT_SECONDS


def missing_settings(settings: Settings) -> list[str]:
    required = {
        "AI_DATABASE_URL": settings.ai_database_url.get_secret_value(),
        "SPRING_BASE_URL": settings.spring_base_url,
        "INTERNAL_API_TOKEN": settings.internal_api_token.get_secret_value(),
        "ANTHROPIC_API_KEY": settings.anthropic_api_key.get_secret_value(),
    }
    if settings.langsmith_tracing:
        required["LANGSMITH_API_KEY"] = settings.langsmith_api_key.get_secret_value()
    return [name for name, value in required.items() if not value]


def build_worker(settings: Settings) -> tuple[Worker, Callable[[], None]]:
    """(워커, 끝낼 때 부를 정리 함수). 연결만 만들고 Claude · Spring 은 아직 부르지 않는다."""
    pool = make_pool(settings.ai_database_url.get_secret_value())
    spring = HttpSpringClient(settings.spring_base_url, settings.internal_api_token.get_secret_value())
    chat_model = ChatAnthropic(
        model=settings.ai_model,
        api_key=settings.anthropic_api_key.get_secret_value(),
        max_tokens=MODEL_MAX_TOKENS,
        default_request_timeout=MODEL_TIMEOUT_SECONDS,
        max_retries=MODEL_MAX_RETRIES,
    )
    handlers = {JobType.RECIPE_DRAFT: RecipeDraftHandler(spring, ClaudeDraftWriter(chat_model))}
    owner = f"{socket.gethostname()}-{os.getpid()}"[:64]
    tracing = tracing_from_settings(settings)
    worker = Worker(JobRegistry(pool), handlers, spring, PostgresSaver(pool), owner, tracing)

    def close() -> None:
        tracing.flush()
        spring.close()
        pool.close()

    return worker, close


def run_forever(
    worker: Worker,
    stop: threading.Event,
    idle_seconds: float = IDLE_SECONDS,
    error_seconds: float = ERROR_SECONDS,
) -> None:
    """stop 이 켜질 때까지 작업을 하나씩 처리한다. 오류가 나도 멈추지 않고 잠시 쉬었다가 다시 한다."""
    while not stop.is_set():
        try:
            did_work = worker.run_once()
        except Exception:
            logger.exception("워커 반복 중 오류. %s초 뒤 다시 시도", error_seconds)
            stop.wait(error_seconds)
            continue
        if not did_work:
            stop.wait(idle_seconds)


def main() -> None:
    configure_logging()
    settings = get_settings()
    missing = missing_settings(settings)
    if missing:
        raise SystemExit(f"워커 환경변수가 없습니다: {', '.join(missing)}")

    worker, close = build_worker(settings)
    stop = threading.Event()
    for sig in (signal.SIGTERM, signal.SIGINT):
        signal.signal(sig, lambda *_: stop.set())

    logger.info("워커 시작 (모델 %s, 추적 %s)", settings.ai_model, "켜짐" if settings.langsmith_tracing else "꺼짐")
    try:
        run_forever(worker, stop)
    finally:
        close()
        logger.info("워커 종료")


if __name__ == "__main__":
    main()
