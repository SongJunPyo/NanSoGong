"""난소공 AI 서비스 (FastAPI) 진입점.

지금은 "서버가 뜨고 Spring 이 부를 수 있는지" 만 확인하는 틀이다.
AI 작업 API(접수 · 조회 · 재개)와 LangGraph 워커는 내부 API 계약이 정해진 뒤 추가한다
(docs/rules/architecture.md 미정 사항: Spring ↔ Python 내부 API 경로 · 인증 방식).

- 이 서버는 인터넷에 공개하지 않는다. 같은 EC2 · 같은 docker 네트워크의 Spring 만 부른다.
- 업무 표를 직접 읽거나 바꾸지 않는다. 필요한 데이터는 Spring 내부 API 로만 받는다 (docs/rules/ai.md).
"""

from fastapi import FastAPI
from prometheus_fastapi_instrumentator import Instrumentator

from app.errors import register_error_handlers

app = FastAPI(title="nansogong-ai", version="0.1.0")
register_error_handlers(app)        # 오류 응답을 { code, message } 로 맞춘다 (app/errors.py)

# 📊 Prometheus 가 읽어 가는 지표 주소 (요청 수 · 지연 시간 · 오류 수). Spring 의 /actuator/prometheus 와 같은 역할
Instrumentator().instrument(app).expose(app, endpoint="/metrics", include_in_schema=False)


@app.get("/health", tags=["상태"])
def health() -> dict[str, str]:
    """서버가 요청을 받을 수 있으면 UP. docker 헬스체크 · 배포 확인에 쓴다 (Spring /actuator/health 와 같은 모양)."""
    return {"status": "UP"}
