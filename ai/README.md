# ai — AI 서비스 (Python · FastAPI)

Spring 이 부르는 **내부용 AI 서버**입니다. 지금은 서버 틀(`/health` · `/metrics`)만 있습니다.
AI 작업 API(접수 · 조회 · 재개) · LangGraph 워커 · 수요 예측 API 는 [아키텍처 미정 사항](../docs/rules/architecture.md#미정-사항)의 내부 API 계약이 정해진 뒤 추가합니다.

| 항목 | 값 |
|---|---|
| 언어 · 프레임워크 | Python 3.12 · FastAPI (`requirements.txt`) |
| 포트 | 컨테이너 8000. 내 PC 에서는 `http://localhost:8001` (8000 은 `web` 프로필이 쓴다) |
| Spring 에서 부르는 주소 | `http://ai-api:8000` (같은 docker compose 네트워크) |
| 공개 여부 | 🚨 인터넷에 열지 않는다. dev EC2 에서도 포트를 열지 않는다 |

## 실행

```bash
docker compose --profile ai up -d --build      # 서버 · DB 등 + AI 서비스
```

- http://localhost:8001/health → `{"status":"UP"}`
- http://localhost:8001/docs → API 문서 (FastAPI 자동 생성)
- Spring 컨테이너에서 확인: `docker compose exec app wget -qO- http://ai-api:8000/health`

## 테스트

```bash
cd ai
python -m venv .venv && . .venv/bin/activate     # Windows: .venv\Scripts\activate
pip install -r requirements-dev.txt
pytest
```

Docker 만 있으면: `docker run --rm -v "$PWD/ai:/app" -w /app python:3.12-slim sh -c "pip install -q -r requirements-dev.txt && pytest"`

## 규칙

- 업무 표를 직접 읽거나 바꾸지 않는다. 데이터는 Spring 내부 API 로만 ([AI 규칙](../docs/rules/ai.md))
- 테스트에서 실제 모델을 부르지 않는다 (과금). 가짜 모델을 쓴다
- 라이브러리를 추가하면 `requirements.txt` 를 고치고 `--build` 로 다시 만든다
- 내부 API 는 `X-Internal-Token` 헤더(환경변수 `AI_SERVICE_TOKEN`)를 검사한다 (`app/security.py`). 토큰을 설정하지 않은 서버는 내부 API 를 모두 401 로 거절한다. `/health` · `/metrics` 는 검사하지 않는다
- 오류 응답은 Spring `BusinessException` 과 같은 `{ "code", "message" }` 모양이다 (`app/errors.py`). 요청 값 검증 실패는 422 가 아니라 400 `INVALID_REQUEST`
- Windows 에서 `pip install -r` 이 `cp949` 오류로 멈추면 `PYTHONUTF8=1` 을 켜고 다시 실행한다 (requirements 파일의 이모지 주석 때문)
