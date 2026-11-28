# ai — AI 서비스 (Python · FastAPI)

Spring 이 부르는 **내부용 AI 서버**입니다. Spring 이 작업(`jobId`)을 넘기면 접수만 하고 바로 답하고, 워커가 LangGraph 그래프를 돌려 진행 · 결과를 Spring 에 보고합니다.
지금 붙어 있는 작업은 레시피 초안(`RECIPE_DRAFT`) 하나입니다. 실제 Spring 내부 API(PR #56)와는 가짜 LLM 으로 이어서 돌려 봤습니다 (정상 · 검증 실패 · 401 뒤 재시도). 실제 Claude 호출과 실제 LangSmith 추적은 아직 확인하지 않았습니다. Spring 에는 아직 작업을 시작해 Python 을 부르는 코드가 없어서, 지금은 `POST /jobs` 를 직접 불러 작업을 넣습니다.

## 실행 명령

같은 이미지로 세 가지를 띄운다.

```bash
python -m app.db.migrate      # 배포할 때 한 번: ai 스키마 표 만들기 · 올리기
python -m app.serve           # API 서버 (ai-api, 이미지 기본 명령). 포트 8000
python -m app.worker          # 워커 (ai-worker). 작업을 받아 처리. 종료 신호(SIGTERM · Ctrl+C)를 받으면 지금 작업을 끝내고 멈춤
```

| 환경변수 | 쓰는 곳 | 뜻 |
|---|---|---|
| `AI_SERVICE_TOKEN` | API 서버 | Spring → Python 호출 토큰 (`X-Internal-Token`). 🚨 `INTERNAL_API_TOKEN` 과 **다른 값**을 쓴다 (방향별 토큰, 한쪽이 새어도 반대 방향은 지켜진다) |
| `AI_DATABASE_URL` | API 서버 · 워커 · migrate | ai 스키마 접속 주소 (Python 전용 계정). 예: `postgresql://ai_app:<AI_DB_PASSWORD>@postgres:5432/nansogong` |
| `SPRING_BASE_URL` | 워커 | Spring 주소 (예: `http://app:8080`) |
| `INTERNAL_API_TOKEN` | 워커 | Python → Spring 호출 토큰. Spring `app.internal.token` 과 같은 환경변수 · 같은 값 |
| `ANTHROPIC_API_KEY` · `AI_MODEL` | 워커 | Claude 키 · 모델 (기본 `claude-haiku-5-5`). Spring 설정과 같은 이름 |
| `LANGSMITH_TRACING` | 워커 | `true` 면 LangSmith 로 추적을 보낸다. 기본 꺼짐 |
| `LANGSMITH_API_KEY` | 워커 | 추적을 켰을 때만 필수 |
| `LANGSMITH_PROJECT` | 워커 | 환경별 프로젝트 (기본 `nansogong-local`. dev 는 `nansogong-dev`) |

워커는 필수 환경변수가 하나라도 없으면 이름만 알려 주고 바로 끝난다. Spring 이 400 · 404 · 409 로 거절하면 다시 시도하지 않고 `SPRING_REJECTED` 로 끝내고, 401 · 5xx · 연결 오류는 나중에 다시 시도한다.

## 로그

표준 출력에 JSON 한 줄씩 쓴다 (`app/logs.py`). 워커가 작업을 처리하는 동안은 `jobId` · `traceId`(추적을 켰을 때)가 붙는다.

```json
{"time": "2026-11-28T06:21:39.346+00:00", "level": "INFO", "logger": "app.jobs.worker", "message": "작업 1: SUCCEEDED", "jobId": 1}
```

- `docker compose logs ai-worker | grep '"jobId": 7'` 처럼 작업 하나의 로그만 볼 수 있다
- 🚨 비밀값 · 개인정보를 로그에 넣지 않는다

## 추적 (LangSmith)

`app/tracing.py`. 추적을 켜면 작업 한 번 실행이 LangSmith 루트 실행 하나가 된다.

- 루트 실행 ID 를 Spring 보고 · 제안의 `langsmithTraceId` 로 보낸다 → Spring `ai_job` · `suggestion` 에서 추적으로 찾아갈 수 있다. 재시도하면 새 실행 ID 가 생기고 `ai_job` 에는 마지막 것이 남는다
- 태그: 업무 이름 (`recipe`). 메타데이터: `jobId` · `jobType` · `workflowKey` · `graphVersion` · `attempt`. `storeId` 는 Python 이 받지 않으므로 넣지 않는다 (`jobId` 로 Spring `ai_job` 에서 찾는다)
- 보내기 전에 `mask()` 가 민감정보를 지운다: 비밀번호 · 토큰 · 쿠키 · 키 · 전화번호 · 사업자번호 · 주소 · 이메일 같은 키의 값, 글 속의 전화번호 · 사업자번호 · 이메일 · API 키 모양. 실행 환경 정보(OS · 환경변수)도 보내지 않는다
- 인증 · 결제 단계(#40)의 값은 `auth` 키(또는 `secret_` 로 시작하는 키) 아래에 둔다 → 통째로 빠진다
- 테스트(`tests/conftest.py`)와 CI 에서는 끈다. 추적 테스트는 네트워크 없이 가짜 Client 로 보낸 내용을 확인한다

| 항목 | 값 |
|---|---|
| 언어 · 프레임워크 | Python 3.12 · FastAPI (`requirements.txt`) |
| 포트 | 컨테이너 8000. 내 PC 에서는 `http://localhost:8001` (8000 은 `web` 프로필이 쓴다) |
| Spring 에서 부르는 주소 | `http://ai-api:8000` (같은 docker compose 네트워크) |
| 공개 여부 | 🚨 인터넷에 열지 않는다. dev EC2 에서도 포트를 열지 않는다 |

## 실행

```bash
docker compose --profile ai up -d --build                       # 서버 · DB 등 + AI API 서버만
docker compose --profile ai --profile ai-worker up -d --build   # + 저장소 준비 · 표 만들기 · 워커 (내 PC 전용)
```

- 처음 한 번: `.env` 에 `AI_SERVICE_TOKEN` · `AI_DB_PASSWORD` · `AI_DATABASE_URL` · `INTERNAL_API_TOKEN` 을 넣는다 (`.env.example` 의 AI 칸). 워커가 실제로 작업을 처리하려면 `ANTHROPIC_API_KEY` 도 필요하다 (과금)
- 🚨 `AI_SERVICE_TOKEN` 과 `INTERNAL_API_TOKEN` 은 서로 다른 값으로 만든다
- `ai-worker` 프로필은 `ai-db-init`(계정 · 스키마, `infra/ai-db/init.sql`) → `ai-migrate`(표) → `ai-worker` 순서로 뜬다. 앞 단계가 실패하면 뒤 단계는 뜨지 않는다 (`docker compose logs ai-db-init` 로 이유 확인)
- dev EC2 는 `ai` 프로필만 켠다 (API 서버만, 작업 API 는 401 · 503). 워커 dev 배포는 Spring 이 Python 을 부르는 코드가 생긴 뒤 따로 한다
- http://localhost:8001/health → `{"status":"UP"}`
- 작업 API 를 쓰려면 `AI_SERVICE_TOKEN` · `AI_DATABASE_URL` 이 있어야 한다 (없으면 401 · 503)
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
- 실제 모델 · 실제 Spring · 실제 LangSmith 를 부르지 않는다 (`tests/fakes.py`, `tests/test_tracing.py`)

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
- 순서: ① `ai` 스키마 · Python 전용 계정(`ai_app`) 만들기 → ② 표 만들기 · 올리기
  1. `bash infra/ai-db/init.sh local` (저장소 최상위에서). `.env` 의 `AI_DB_PASSWORD` 가 필요하다 (`openssl rand -hex 24`). 여러 번 실행해도 된다
  2. 배포 명령 `python -m app.db.migrate` (`AI_DATABASE_URL` 의 DB). 서버 · 워커는 실행 중에 표를 만들지 않는다
- 새 표 · 칸은 `app/db/migrations/` 에 다음 번호 SQL 파일로 추가한다. 이미 적용된 파일은 고치지 않는다
- `ai_app` 은 `ai` 스키마만 쓸 수 있고 업무 표(public) 권한이 없다. dev · prod 용 초기화는 AI 워커를 배포할 때 추가한다

## 규칙

- 업무 표를 직접 읽거나 바꾸지 않는다. 데이터는 Spring 내부 API 로만 ([AI 규칙](../docs/rules/ai.md))
- 테스트에서 실제 모델을 부르지 않는다 (과금). 가짜 모델을 쓴다
- 라이브러리를 추가하면 `requirements.txt` 를 고치고 `--build` 로 다시 만든다
- 내부 API 는 `X-Internal-Token` 헤더(환경변수 `AI_SERVICE_TOKEN`)를 검사한다 (`app/security.py`). 토큰을 설정하지 않은 서버는 내부 API 를 모두 401 로 거절한다. `/health` · `/metrics` 는 검사하지 않는다
- 오류 응답은 Spring `BusinessException` 과 같은 `{ "code", "message" }` 모양이다 (`app/errors.py`). 요청 값 검증 실패는 422 가 아니라 400 `INVALID_REQUEST`
- Windows 에서 `pip install -r` 이 `cp949` 오류로 멈추면 `PYTHONUTF8=1` 을 켜고 다시 실행한다 (requirements 파일의 이모지 주석 때문)
