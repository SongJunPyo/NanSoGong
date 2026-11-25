# AGENTS.md

AI 코딩 도구(Claude Code · Codex · Cursor 등)가 이 저장소에서 작업할 때 **매번 먼저 읽고 지키는 규칙**입니다.
이 파일에는 모든 작업에 공통인 규칙만 둡니다. 영역별 세부 규칙은 `docs/rules/` 에 있습니다. 작업 전에 [1-2 표](#1-2-작업-영역--먼저-읽을-문서)에 따라 해당 문서를 읽습니다.
규칙이 서로 다르면 **사용자의 직접 지시 > 이 파일 > 세부 규칙 문서 > 기타 문서** 순서로 따릅니다.

> `CLAUDE.md` 는 Claude Code가 이 파일을 불러오게 하는 한 줄짜리 연결 파일입니다. 내용을 추가하지 않습니다. (Codex는 이 파일을 바로 읽습니다.)

## 0. 한 줄 요약

**난소공**: 소상공인 사장님을 위한 AI 매장 운영 에이전트 (PWA). Spring Boot가 업무 · 승인을 관리하고, Python · LangGraph가 AI 작업을 수행합니다. 저장소 구조는 수업 실습 저장소 [WONIT-A/07_cicd](https://github.com/WONIT-A/07_cicd)를 따릅니다.

| 영역 | 기술 |
|---|---|
| FE | React 19, Vite, vite-plugin-pwa, Tailwind CSS v4, shadcn/ui, TanStack Query, Zustand (JavaScript · JSX, TypeScript 아님) |
| BE | Java 21, Spring Boot 4, Spring Security + JWT, Spring Data JPA, Flyway, ShedLock, PostgreSQL 17, Redis |
| AI | Python · FastAPI · LangGraph (전환 중, 기존 Spring AI 코드 유지 중), Claude API, `ml/` 수요 예측 (LightGBM), LangSmith 추적 |
| Infra | Docker Compose(로컬), AWS (CloudFormation · ECR · CodeDeploy), GitHub Actions |

## 1. 기준 문서

### 1-1. 문서 목록

| 문서 | 담는 것 |
|---|---|
| [docs/rules/backend.md](docs/rules/backend.md) | Spring 패키지 구조, 계층별 코드 규칙, 내부 API, 백엔드 테스트 |
| [docs/rules/frontend.md](docs/rules/frontend.md) | 프론트 폴더 구조, 코드 규칙, 확인 명령 |
| [docs/rules/ai.md](docs/rules/ai.md) | AI 원칙, 기능별 그래프 흐름, 도구 권한 · 승인, 상태 저장 · 재개, 인증 · 입력 데이터, 프롬프트 · 추적 |
| [docs/rules/domain.md](docs/rules/domain.md) | 도메인 목록 · 경계, 도메인 사이 메서드 계약, 판매 · 발주 · 결제 · 쿠폰 · 메뉴 업무 규칙, **현재 범위 밖 기능** |
| [docs/rules/db.md](docs/rules/db.md) | 표 · 칸 이름 · 타입, Flyway, 매장 분리, 공용 표 칸 계약 |
| [docs/rules/architecture.md](docs/rules/architecture.md) | 시스템 구성 · 역할, Spring ↔ Python 경계, 상태 저장 위치, 배포 범위, **미정 사항** |
| [docs/rules/issue.md](docs/rules/issue.md) | GitHub Issue 진행 관리, AI 에이전트의 이슈 갱신 규칙 |
| [README.md](README.md) | 실행 방법, 환경 구성, 브랜치 전략, CI/CD, 자주 나는 문제 |
| [유저 플로우 1.04](docs/pjt_source/유저_플로우_1.04.md), `요구사항정의서_수정본1.1.xlsx` | 사용자 흐름 · 예외 처리 · 기능 요구사항 번호(구현-x-y) |
| [docs/pjt_source/store-agent-db.sql](docs/pjt_source/store-agent-db.sql) | 전체 표 구조 (27개) |
| [docs/changes/](docs/changes/README.md) | 환경 · 구조 변경 이력 |
| [WONIT-A/07_cicd](https://github.com/WONIT-A/07_cicd) | 구조의 기준. 새 패키지 · 폴더 · 클래스를 만들 때 같은 계층의 파일 모양을 먼저 참고한다 |

### 1-2. 작업 영역 → 먼저 읽을 문서

작업을 시작하기 전에 **해당 행의 문서를 모두 읽습니다.** 여러 영역에 걸치면 각 행을 다 읽습니다.

| 작업 영역 | 먼저 읽을 문서 |
|---|---|
| `backend/` controller · service · dto · exception | [backend](docs/rules/backend.md) · [domain](docs/rules/domain.md) |
| `backend/` model · repository, `db/migration/` · `docs/pjt_source/*.sql` | [db](docs/rules/db.md) · [backend](docs/rules/backend.md) · [domain](docs/rules/domain.md) |
| 판매 저장 · 재고 차감 · 발주 · 결제 · 입고 · 쿠폰 · 메뉴 업무 로직 | [domain](docs/rules/domain.md) · [db](docs/rules/db.md) |
| 승인 · 실행 · 제안(`suggestion` · `approval` · `execution`) | [domain](docs/rules/domain.md) · [ai](docs/rules/ai.md) · [db](docs/rules/db.md) |
| `frontend/` | [frontend](docs/rules/frontend.md) · 화면이 다루는 도메인의 [domain](docs/rules/domain.md) 절 |
| AI: Python 서비스 · LangGraph · 프롬프트 · `backend/.../ai/` · `ml/` | [ai](docs/rules/ai.md) · [architecture](docs/rules/architecture.md) · [domain](docs/rules/domain.md) |
| Spring ↔ Python 내부 API · 브라우저 실행기 | [architecture](docs/rules/architecture.md) · [ai](docs/rules/ai.md) · [backend](docs/rules/backend.md) |
| `docker-compose*.yml` · `infra/` · `.github/workflows/` · 환경변수 | [README](README.md) · [architecture](docs/rules/architecture.md#배포-범위) · 이 파일 [4장](#4-환경--보안--github) |
| `mock/` | [backend](docs/rules/backend.md#외부-연동--설정) · [domain](docs/rules/domain.md) |
| 문서 (`AGENTS.md` · `docs/`) | 이 파일 [6장](#6-프로젝트-문서-관리-규칙) |
| GitHub Issue · PR | [issue](docs/rules/issue.md) · 이 파일 [4장](#4-환경--보안--github) |

## 2. 작업 원칙

- **요청받은 범위만 고친다.** 관련 없는 리팩터링 · 포맷 변경 · 파일 이동을 끼워 넣지 않는다.
- **도메인 경계를 지킨다.** 다른 도메인의 repository · Entity를 직접 쓰지 않고, 그 도메인의 service 계약([domain.md](docs/rules/domain.md#도메인-사이-메서드-계약))으로만 부른다. 필요한 메서드가 없으면 다른 도메인 코드를 고치지 않는다. 그 도메인 라벨을 붙인 `request` 이슈로 요청한다 ([issue.md](docs/rules/issue.md)).
- **공용 파일은 고치기 전에 사용자에게 먼저 확인한다**: `backend/.../common/`, `frontend/src/api/client.js`, `frontend/src/components/ui/`, `docker-compose*.yml`, `backend/build.gradle`, `frontend/package.json`, `.github/workflows/`
- **범위 밖 기능은 요청이 없으면 만들지 않는다.** 목록은 [domain.md 현재 범위 밖](docs/rules/domain.md#현재-범위-밖)에 있다. 화면이 필요하면 프론트 목업으로 대신한다.
- **미정 사항은 추측해서 만들지 않는다** ([architecture.md 미정 사항](docs/rules/architecture.md#미정-사항)). 모르는 것(표 칸 이름, API 모양 등)은 질문한다. 가정하고 진행해야 하면 코드 주석과 답변에 가정을 분명히 적는다.
- 인프라는 **dev 환경만** 다룬다. 운영(prod) 배포 변경은 요청이 있을 때만 한다.
- 작업이 끝나면 **무엇을 확인했는지**(테스트 · lint · 빌드 결과)를 그대로 보고한다. 실행하지 않은 검증을 "통과"라고 말하지 않는다.
- 작업한 이슈가 있으면 [issue.md](docs/rules/issue.md)에 따라 진행 상황을 갱신한다.

## 3. 명명 규칙

### 3-1. Java (백엔드)

| 구분 | 표기법 | 예시 | 비고 |
|---|---|---|---|
| 파일 · 클래스 · 인터페이스 · record · enum | PascalCase | `InventoryService.java`, `InventoryItemResponse` | 파일명 = public 클래스명 |
| 변수 · 메서드 · 파라미터 | camelCase | `storeId`, `checkOwner()` | |
| 상수 · enum 값 | UPPER_SNAKE_CASE | `MAX_RETRY_COUNT`, `ApprovalStatus.PENDING` | |
| 패키지 | 모두 소문자, 단어 하나 | `com.nansogong.service` | 대문자 · `_` · `-` 금지 |
| 에러 코드 문자열 | UPPER_SNAKE_CASE | `"INVENTORY_ITEM_NOT_FOUND"` | `BusinessException` 의 `code` |

- 🚨 **kebab-case(`-`)는 Java 식별자에 쓸 수 없다** (뺄셈 연산자로 해석되어 컴파일 에러).
- **클래스 이름 앞에 도메인 접두사를 붙인다** (`Inventory…`, `Purchase…`). 도메인별 접두사 · URL은 [domain.md 도메인 목록](docs/rules/domain.md#도메인-목록)을 따른다.
- 계층별 접미사: `XxxController`, `XxxService`, `XxxRepository`. 엔티티는 접미사 없이 `InventoryItem`. DTO는 `XxxCreateRequest` · `XxxUpdateRequest` · `XxxResponse`. 예외는 `XxxNotFoundException` 처럼 업무 이름 + `Exception`.

### 3-2. Python (AI 서비스 · `ml/`)

| 대상 | 표기법 | 예시 |
|---|---|---|
| 모듈 · 패키지 · 파일 | snake_case | `purchase_graph.py`, `forecast/` |
| 함수 · 변수 | snake_case | `check_primary_supplier()` |
| 클래스 · Pydantic 모델 | PascalCase | `PurchasePlan`, `RecipeDraft` |
| 상수 | UPPER_SNAKE_CASE | `MAX_REVISIONS` |

- Pydantic 모델의 JSON 키는 camelCase로 내보낸다 (Java record와 같은 모양).

### 3-3. 코드 밖 이름

| 대상 | 표기법 | 예시 |
|---|---|---|
| REST URL 경로 | kebab-case, 복수 명사 | `/api/stores/{storeId}/purchase-orders` |
| Spring 설정 키 · 설정 파일명 | kebab-case | `app.jwt.access-ttl`, `application-dev.yml` |
| 리소스 · 프롬프트 파일 | kebab-case | `prompts/agent-plan.st`, `user-profile.png` |
| DB 표 · 칸 | snake_case 소문자 | `inventory_item`, `store_id` ([db.md](docs/rules/db.md)) |
| Flyway 파일 | `V<연월일시분>__<snake_case 설명>.sql` | `V202611241030__create_member_store.sql` |
| 환경변수 | UPPER_SNAKE_CASE | `ANTHROPIC_API_KEY`, `JWT_SECRET` |
| JSON 요청 · 응답 필드, JSONB 키 | camelCase | `{ "storeId": 1, "unitPrice": 1200 }` |
| 쿼리 파라미터 | camelCase | `?from=2026-11-01&groupBy=week` |
| 문서 파일 | [6장](#6-프로젝트-문서-관리-규칙) | |

### 3-4. 프론트엔드 (JavaScript · React)

| 대상 | 표기법 | 예시 |
|---|---|---|
| 컴포넌트 파일 · 컴포넌트 이름 | PascalCase `.jsx` | `InventoryPage.jsx`, `InventoryItemRow.jsx` |
| 화면(페이지) 컴포넌트 | `XxxPage.jsx` | `LoginPage.jsx` |
| 훅 | `useXxx` camelCase `.js` | `useInventoryItems.js`, `useAuthStore.js` |
| api 파일 | 도메인 이름 소문자 `.js` | `api/inventory.js` |
| 변수 · 함수 | camelCase | `getItems()`, `selectedStoreId` |
| 상수 | UPPER_SNAKE_CASE | `DEFAULT_PAGE_SIZE` |
| 도메인 폴더 | 소문자 | `components/inventory/` |
| shadcn 부품 (`components/ui/`) | shadcn이 만든 이름 그대로 (kebab-case 소문자) | `button.jsx` |

## 4. 환경 · 보안 · GitHub

### 4-1. 비밀값 · 개인정보

- API 키 · 비밀번호는 로컬 `.env` 또는 배포 환경의 Secrets에만 둔다. 코드 · `application*.yml` · 커밋 메시지 · 로그 · 이슈 · AI 입력에 인증 원문을 넣지 않는다.
- `.env` 는 커밋하지 않는다 (`.env.example` 만 커밋).
- 쇼핑몰 로그인 세션 · 쿠키 · 비밀번호는 서버 DB · 로그 · 추적에 넣지 않는다. DB에는 참조(`auth_ref`)만 둔다. 보관 방식은 미정이다 ([ai.md](docs/rules/ai.md#인증--입력-데이터)).
- 개인정보(이름 · 전화번호 · 사업자번호 · 배송지)를 로그 · 프롬프트 · 추적에 넣지 않는다.

### 4-2. 환경을 바꿀 때

| 바꾸는 것 | 함께 바꿀 곳 |
|---|---|
| 새 환경변수 | `.env.example` + `application.yml`(로컬 기본값) + `application-aws.yml` + `infra/secrets/README.md` 키 목록 · `*.example.json` |
| `app.*` 설정 | `application.yml` + `common/AppProperties.java` |
| 외부 API 응답 모양 | `mock/mappings/*.json` (같은 PR) |
| 표 구조 | 새 Flyway 파일 ([db.md](docs/rules/db.md)) |
| 그 밖의 버전 · 라이브러리 | [README 환경을 바꿀 때 규칙](README.md#4-환경을-바꿀-때-규칙) |

환경 · 구조를 바꾸는 PR에는 `docs/changes/` 기록을 하나 함께 올린다 ([6장](#6-프로젝트-문서-관리-규칙)).

### 4-3. 브랜치 · PR

- 각자 **자기 이름 브랜치**에서 작업한다 → `dev` 로 PR → (확인 후) `main`.
- 시작 전에 `git fetch origin && git merge origin/dev` 를 한다.
- 🚨 **`rebase` · `push --force` · `dev`/`main` 직접 push 금지.** PR은 **Create a merge commit** 으로만 머지한다.
- **기능 하나 = 이슈 하나 = PR 하나.** PR 본문에 `Closes #이슈번호` 를 넣는다.
- push는 사용자가 요청할 때만 한다.

### 4-4. 커밋 메시지

형식: `[TYPE]: subject` (예: `[FEAT]: 회원가입 API 추가`)

| 타입 | 사용 기준 |
|---|---|
| `FEAT` | 새 기능 추가 · 기존 기능 확장 |
| `FIX` | 버그 수정 (긴급 수정 포함) |
| `REFACTOR` | 기능 변경 없는 구조 · 가독성 개선 |
| `PERF` | 성능 개선 |
| `DOCS` | README · 규칙 · API 명세 등 문서 |
| `TEST` | 테스트 추가 · 수정 |
| `STYLE` | 동작에 영향 없는 포맷 변경 |
| `CHORE` | 빌드 · 의존성 · 환경 설정 · CI/CD |

- 타입은 영문 대문자, 콜론 뒤에 공백 한 칸.
- 제목은 50자 이내, 마침표 없이, `추가` · `수정` · `개선` · `제거` 같은 **명사형**으로 끝낸다.
- 한 커밋에는 **하나의 논리적 변경**만 담는다. 파일 이름 변경 · 삭제도 목적에 맞는 타입으로 분류한다.

### 4-5. 커밋 단위

**되돌리거나 검토할 가치가 있는 중요한 변경이 완성됐을 때만 커밋**한다. 같은 기능의 컴포넌트 · 스타일 · 상태 처리 · 검증은 함께 묶는다. 중간 작업이나 자잘한 수정마다 커밋하지 않는다.

- **커밋 전에 확인한다.** 백엔드는 최소 `./gradlew compileJava` (테스트가 있는 변경은 `./gradlew test`), 프론트는 `npm run lint`. 빌드가 깨진 상태로 커밋하지 않는다. 확인하지 못한 검증이 있으면 보고에 그대로 적는다.
- 커밋에는 **그 변경에 필요한 파일만** 넣는다. `git add .` · `git add -A` 대신 파일을 골라서 add하고, `.env` 같은 비밀값 파일이 섞이지 않았는지 `git status` 로 확인한다.
- AI 도구는 중요한 변경을 완성하고 검증하면 다시 묻지 않고 커밋한다. 커밋 해시 · 메시지를 보고하고 관련 이슈에 댓글을 남긴다. 사용자가 "커밋하지 마"라고 하면 따른다.
- 이미 push한 커밋은 고치거나 지우지 않는다 (`commit --amend` · `reset` 후 force push 금지). 되돌릴 때는 `git revert`.

### 4-6. 자주 쓰는 명령

```bash
docker compose up -d                          # 서버(8080) + PostgreSQL + Redis + 목업(8089)
docker compose logs -f app                    # 서버 로그
cd frontend && npm ci && npm run dev          # 화면 (5173)
bash infra/demo-data/load.sh local            # 데모 데이터
docker compose down -v && docker compose up -d  # 로컬 DB 초기화
```

| 주소 | 용도 |
|---|---|
| http://localhost:5173 | 화면 (CORS 때문에 이 주소로) |
| http://localhost:8080/api/ping | 서버 · DB · Redis 연결 상태 |
| http://localhost:8080/swagger-ui/index.html | API 문서 |
| http://localhost:8089/__admin/requests | 목업이 받은 요청 기록 |

나머지 실행 방법 · 문제 해결은 [README](README.md)를 본다.

## 5. 테스트 규칙

### 5-1. 단위 테스트

- **대상**: 계산 · 변환 · 검증 로직 (금액 · 수량 · 단위 환산, 상태 전이 조건, 출력 모델 검증, 그래프 노드의 분기 함수).
- 외부 의존(DB · 다른 서버 · 모델)을 쓰지 않는다. 빨리 돌아야 한다.
- 돈 · 수량은 경계값을 넣어 확인한다 (0, 소수 자릿수, 포장 환산, 취소 수량).
- Java: JUnit 5. Python: pytest. 프론트: 아직 테스트 도구가 없다 (`node:test` 로 된 파일만 있다). 도구를 추가하려면 `package.json` 이 공용 파일이므로 먼저 확인한다.

### 5-2. 기능(흐름) 테스트

- 기능마다 **흐름 테스트를 최소 1개** 만든다. 07_cicd `TransferFlowTest` 처럼 요청 → 저장 → 결과까지 실제 흐름을 따라간다.
- 백엔드는 Testcontainers(PostgreSQL · Redis)를 쓴다 → Docker가 필요하다.
- 반드시 넣을 경우: 다른 매장 접근 차단(403), 중복 요청 · 재처리 시 한 번만 반영, 실패 경로.
- AI가 관련된 기능은 [ai.md 검증 기준](docs/rules/ai.md#ai-기능-검증-기준)의 경우도 확인한다.

### 5-3. 공통

- **AI 모델 · 외부 서비스는 테스트에서 mock으로 바꾼다** (실제 호출 = 과금 · 실제 주문 위험). CI는 실제 모델 호출 · 실제 구매 없이 돈다.
- 가짜(mock) 결과로 확인한 것과 실제 사이트 · 실제 API로 확인한 것을 구분해서 보고한다.
- 실행 명령

  ```bash
  cd backend && ./gradlew test                  # 백엔드 (Docker 필요)
  cd frontend && npm run lint && npm run build  # 프론트
  ```

### 완료의 정의

다음 넷을 모두 채워야 "완료"입니다. 이슈의 완료 기준도 이것을 바탕으로 씁니다.

① 화면 또는 Swagger(`http://localhost:8080/swagger-ui/index.html`)로 동작 확인 ② 흐름 테스트 1개 이상 ③ PR 체크(`backend / test`, `frontend / check`) 통과 ④ `dev` 머지

## 6. 프로젝트 문서 관리 규칙

### 6-1. 문서 종류와 위치

| 종류 | 위치 | 이름 | 고치는 방법 |
|---|---|---|---|
| 공통 규칙 | `AGENTS.md` | — | 계속 고쳐 쓴다 |
| 세부 규칙 · 설계 | `docs/rules/<영역>.md` | 날짜 없는 영어 소문자 (`backend.md`) | 계속 고쳐 쓴다. 항상 현재 기준만 남긴다 |
| 변경 이력 | `docs/changes/` | `연-월-일-순번-짧은-설명.md` | 머지된 기록은 고치지 않는다. 바뀌면 새 기록을 쓴다 ([작성법](docs/changes/README.md)) |
| 원본 자료 | `docs/pjt_source/` | 원본 이름 유지 | 유저 플로우 · 요구사항 · 표 설계 원본 |
| 진행 상황 · 일정 · 담당 | **GitHub Issue** | — | [issue.md](docs/rules/issue.md) |

- **일정 · 담당 · 진행 상황 · 회의 날짜를 저장소 문서에 쓰지 않는다.** 모두 GitHub Issue(Assignees · Milestone · 댓글)에 둔다.
- 규칙 문서에는 **결정된 내용만** 쓴다. "언제 누가 정했는지" 같은 배경은 변경 이력(`docs/changes/`)이나 이슈에 남긴다.
- 정해지지 않은 것은 "미정"이라고 분명히 적는다 ([architecture.md 미정 사항](docs/rules/architecture.md#미정-사항)). 결정할 일은 `decision` 이슈로 만든다.

### 6-2. 쓰는 규칙

- **같은 내용은 한 곳에만 쓴다.** 다른 문서에서는 복사하지 않고 링크한다. 각 문서가 맡는 범위는 [1-1 표](#1-1-문서-목록)를 따른다.
- 링크는 절 번호가 아니라 **제목 앵커**로 건다 (`db.md#매장-분리`). 그래서 제목을 바꾸면 그 앵커를 쓰는 링크도 같은 PR에서 고친다.
- 코드 · 표 · API를 바꾸는 PR은 관련 규칙 문서도 **같은 PR에서** 고친다. 문서가 코드와 다르면 코드 쪽 사실을 확인한 뒤 문서를 고친다.
- 새 규칙 문서를 만들거나 위 목차를 바꾸려면 사용자에게 먼저 확인한다. 만든 뒤에는 [1-1](#1-1-문서-목록) · [1-2](#1-2-작업-영역--먼저-읽을-문서) 표에 추가한다.
- 문장은 짧은 평서문(`~한다`)으로, 표 · 목록을 우선 쓴다. 상태 코드 · 칸 이름은 코드 그대로 적는다.
- `CLAUDE.md` 에는 내용을 추가하지 않는다.
