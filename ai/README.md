# ai — AI 서비스 (Python · FastAPI)

Spring 이 부르는 **내부용 AI 서버**입니다. Spring 이 작업(`jobId`)을 넘기면 접수만 하고 바로 답하고, 워커가 LangGraph 그래프를 돌려 진행 · 결과를 Spring 에 보고합니다.
지금 붙어 있는 작업은 레시피 초안(`RECIPE_DRAFT`) 하나입니다. Spring 내부 API(#35) · 실제 Claude 연결 · 워커 실행 명령 · docker-compose 연결은 아직 없습니다 (테스트는 가짜 Spring · 가짜 LLM).

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
- 작업 API 를 쓰려면 `AI_SERVICE_TOKEN` · `AI_DATABASE_URL` 이 있어야 한다 (없으면 401 · 503). 아직 docker-compose 에 연결하지 않았다
- http://localhost:8001/docs → API 문서 (FastAPI 자동 생성)
- Spring 컨테이너에서 확인: `docker compose exec app wget -qO- http://ai-api:8000/health`

## 테스트

```bash
cd ai
python -m venv .venv && . .venv/bin/activate     # Windows: .venv\Scripts\activate
pip install -r requirements-dev.txt
pytest
```

- 작업 등록부 · 체크포인트 테스트는 testcontainers 로 Postgres 17 컨테이너를 띄운다 → **Docker Desktop 이 켜져 있어야 한다.** Docker 가 없으면 내 PC 에서는 그 테스트만 건너뛰고, CI(`CI=true`)에서는 실패한다
- 실제 모델 · 실제 Spring 을 부르지 않는다 (`tests/fakes.py`)

## 작업 API (Spring → Python)

모두 `X-Internal-Token` 이 필요하다. 모양은 `app/models/job.py`, 결정 배경은 #34 ⑥.

| 경로 | 하는 일 |
|---|---|
| `POST /jobs` `{ jobId, jobType, workflowKey, input }` | 접수. 새 작업 202, 같은 `jobId` · 같은 내용 200(기존 작업), 내용이 다르면 409 `JOB_CONFLICT`. 그래프가 없는 종류는 400 `UNSUPPORTED_JOB_TYPE`, 입력이 종류에 안 맞으면 400 `INVALID_JOB_INPUT` |
| `GET /jobs/{jobId}` | 조회 (Spring 이 대조 · 복구할 때). 화면은 이 API 가 아니라 Spring `ai_job` 을 본다 |
| `POST /jobs/{jobId}/cancel` | 취소. 처리 중이면 워커가 다음 단계 전에 멈춘다. 끝난 작업은 그대로 |

진행 · 결과는 Python 이 Spring `POST /internal/ai-jobs/{jobId}/reports` 로 `seq` 순서대로 보낸다 (보고 편지함 `ai.job_report`).

## AI 작업 저장소 (Postgres `ai` 스키마)

- 표: 작업 등록부(`ai.job`) · 보고 편지함(`ai.job_report`) · LangGraph 체크포인트. 규칙은 [DB 규칙 AI 작업 저장소](../docs/rules/db.md#ai-작업-저장소-ai-스키마)
- 표 만들기 · 올리기는 배포 명령: `python -m app.db.migrate` (`AI_DATABASE_URL` 의 DB). 서버 · 워커는 실행 중에 표를 만들지 않는다
- 새 표 · 칸은 `app/db/migrations/` 에 다음 번호 SQL 파일로 추가한다. 이미 적용된 파일은 고치지 않는다
- `ai` 스키마와 Python 전용 계정은 인프라 DB 초기화 스크립트가 만든다 (아직 없음, #34 ④)

## 규칙

- 업무 표를 직접 읽거나 바꾸지 않는다. 데이터는 Spring 내부 API 로만 ([AI 규칙](../docs/rules/ai.md))
- 테스트에서 실제 모델을 부르지 않는다 (과금). 가짜 모델을 쓴다
- 라이브러리를 추가하면 `requirements.txt` 를 고치고 `--build` 로 다시 만든다
- 내부 API 는 `X-Internal-Token` 헤더(환경변수 `AI_SERVICE_TOKEN`)를 검사한다 (`app/security.py`). 토큰을 설정하지 않은 서버는 내부 API 를 모두 401 로 거절한다. `/health` · `/metrics` 는 검사하지 않는다
- 오류 응답은 Spring `BusinessException` 과 같은 `{ "code", "message" }` 모양이다 (`app/errors.py`). 요청 값 검증 실패는 422 가 아니라 400 `INVALID_REQUEST`
- Windows 에서 `pip install -r` 이 `cp949` 오류로 멈추면 `PYTHONUTF8=1` 을 켜고 다시 실행한다 (requirements 파일의 이모지 주석 때문)
