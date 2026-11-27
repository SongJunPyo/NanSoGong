"""난소공 AI 서비스 (FastAPI) 진입점.

- 작업 API(/jobs): Spring 이 AI 작업을 넘긴다. 처리는 워커가 한다 (app/jobs/).
- 이 서버는 인터넷에 공개하지 않는다. 같은 EC2 · 같은 docker 네트워크의 Spring 만 부른다.
- 업무 표를 직접 읽거나 바꾸지 않는다. 필요한 데이터는 Spring 내부 API 로만 받는다 (docs/rules/ai.md).
"""

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from prometheus_fastapi_instrumentator import Instrumentator

from app.config import get_settings
from app.db.pool import make_pool
from app.errors import register_error_handlers
from app.jobs.registry import JobRegistry
from app.jobs.routes import router as jobs_router


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    # 작업 저장소 주소가 없으면 작업 API 만 503 이고, /health · /metrics 는 그대로 동작한다
    url = get_settings().ai_database_url.get_secret_value()
    pool = make_pool(url) if url else None
    app.state.job_registry = JobRegistry(pool) if pool else None
    try:
        yield
    finally:
        if pool:
            pool.close()


app = FastAPI(title="nansogong-ai", version="0.1.0", lifespan=lifespan)
register_error_handlers(app)        # 오류 응답을 { code, message } 로 맞춘다 (app/errors.py)
app.include_router(jobs_router)

# 📊 Prometheus 가 읽어 가는 지표 주소 (요청 수 · 지연 시간 · 오류 수). Spring 의 /actuator/prometheus 와 같은 역할
Instrumentator().instrument(app).expose(app, endpoint="/metrics", include_in_schema=False)


@app.get("/health", tags=["상태"])
def health() -> dict[str, str]:
    """서버가 요청을 받을 수 있으면 UP. docker 헬스체크 · 배포 확인에 쓴다 (Spring /actuator/health 와 같은 모양)."""
    return {"status": "UP"}
