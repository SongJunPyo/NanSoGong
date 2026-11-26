# 난소공

소상공인 맞춤형 AI 매장 운영 에이전트 · 사장님 전용 서비스

| 영역 | 기술 |
|---|---|
| FE | React 19, Vite 8, vite-plugin-pwa, Tailwind CSS v4, shadcn/ui, TanStack Query, Zustand |
| BE | Java 21, Spring Boot 4, Spring Security + JWT, Spring Data JPA, ShedLock, PostgreSQL(RDS), Redis(ElastiCache) |
| AI | Python · FastAPI · LangGraph (구현 전), Claude API, LightGBM |
| Infra | AWS (EC2 ASG Graviton · ALB · WAF · RDS · ElastiCache · S3 · CloudFront · ECR · CodeDeploy · CloudFormation), Docker, Prometheus, Grafana |
| CI/CD · Test | GitHub Actions, JUnit 5, Testcontainers, Postman · Boomerang |

## 폴더 구조

```
.
├── .github/             # workflows/ = GitHub Actions(backend.yml · frontend.yml), PR · 이슈 템플릿
├── backend/             # Spring Boot 서버 (build.gradle · gradlew · Dockerfile · src)
│   └── src/             #   계층별 패키지(controller · service · repository · model · dto · exception · ai · common), resources/db/migration = Flyway SQL, api.http = 요청 모음
├── frontend/            # React · Vite 화면 (src/features = 도메인별 폴더)
├── mock/                # 🎭 외부 연동 목업 (국세청 · 기상청 · 특일 · 네이버 · POS · 거래처 · 마이데이터)
├── ml/                  # 🤖 수요 예측 실험 (Python · LightGBM · Jupyter)
├── monitoring/          # 로컬 Prometheus 설정 · Grafana 상황판(JSON)
├── infra/               # AWS: CloudFormation 템플릿 · CodeDeploy 배포 스크립트 · dev 갱신 스크립트 · 데모 데이터 · 비밀값 틀
├── docs/                # 팀 문서 (rules/ = 세부 규칙 · 설계, pjt_source/ = 원본 자료)
├── docker-compose.yml   # 🐳 로컬 개발용 서버 · PostgreSQL · Redis · 목업 (· 화면 nginx · Prometheus · Grafana · Jupyter)
├── docker-compose.dev.yml # AWS dev EC2 전용 덧씌우기 (ECR 이미지 · 80 포트 화면). 내 PC 에서는 쓰지 않는다
└── .env.example         # 환경변수 견본 → 복사해서 .env 를 만든다
```

> 💡 **개발 환경은 이미지가 아니라 이 저장소로 공유합니다.**
> PostgreSQL · Redis 버전은 `docker-compose.yml`, Java 버전은 `backend/build.gradle`(toolchain), Gradle 버전은 `backend/gradlew`,
> Node 버전은 `.nvmrc`, npm 패키지 버전은 `frontend/package-lock.json` 이 고정합니다.
> AWS ECR 에는 **배포용 이미지**(서버 · dev 화면, arm64)만 Actions 가 올립니다.

## 규칙 · 설계 · 진행 상황

- 코드 규칙: [AGENTS.md](AGENTS.md) (공통) + [`docs/rules/`](docs/rules/) (백엔드 · 프론트 · AI · 도메인 · DB · 아키텍처)
- 도메인 구분 · 유저 플로우 · 요구사항 번호: [도메인 규칙](docs/rules/domain.md#도메인-목록)
- 목표 시스템 구조 (Spring Boot + Python · LangGraph): [아키텍처](docs/rules/architecture.md). 아래 기술 · 실행 안내는 현재 코드 기준입니다.
- 진행 상황 · 일정 · 담당: GitHub Issues ([이슈 규칙](docs/rules/issue.md))

## 요구사항이 개발 환경에 요구하는 것

| 요구사항 | 개발 환경에 반영한 것 |
|---|---|
| 1-2 국세청 진위확인, 1-13 기상청, 2-5 특일, 4-5 네이버 데이터랩 | 목업(`mock/`)이 기본. `.env` 에 키 · 주소를 넣으면 진짜 API. 호출용 `RestClient` 는 `common/ExternalApiConfig` |
| 1-7 ~ 1-10 POS 시뮬레이터 · 가상 거래처 · 마이데이터 (MVP 목업) | 같은 목업 서버에 계약 초안 + 실패 시나리오(품절 · 부분 성공 · 지연 · 멱등 키 누락) |
| 1-1 · 1-4 휴대폰 본인인증 (MVP 목업) | `app.verification.mode=mock`, 인증번호 `000000` |
| 1-3 JWT Access/Refresh · 자동 로그인 · 로그아웃 무효화 | `app.jwt.*-ttl`, Redis, CORS `allowCredentials` + 프론트 `credentials: 'include'` |
| 1-7 · 7-1 연동 인증 정보 암호화 | `app.crypto.credential-key` (로컬 기본값, AWS 는 환경별 키) |
| 1-6 매장 전환 · 매장 간 데이터 분리 | 프론트 `useStoreSelection` (마지막 선택 매장 기억) |
| 1-9 원본 payload JSONB · 2-2 머티리얼라이즈드 뷰 · 5-1 date_trunc · 5-2 generate_series | 로컬 · 테스트 · AWS 모두 같은 PostgreSQL 17 |
| 2-6 쿠폰 기간 충돌 exclusion constraint | Flyway V1 에서 `btree_gist` 확장 |
| 1-14 메뉴명 유사도 연결 후보 · 3-4 품목 검색 | Flyway V1 에서 `pg_trgm` 확장 |
| 1-13 · 3-6 · 6-1 · 6-9 주기 실행 | `@Scheduled` + ShedLock (서버 여러 대여도 한 번만), 시간대 Asia/Seoul 고정 |
| 6-1 이동평균 → LightGBM, 시간 순서 검증 | `ml/` Jupyter 환경 (`docker compose --profile ml`) |
| 6-2 · 7-1 API 키는 Secrets Manager | AWS 비밀값은 `nansogong/dev` · `nansogong/prod` 비밀 (콘솔에서 넣기: `infra/secrets/README.md`) |
| 7-3 React + Vite PWA 모바일 우선 | vite-plugin-pwa, Tailwind, shadcn/ui |

---

## 0. 세팅 담당자가 처음 한 번만 할 일

1. GitHub 에 팀 저장소를 만들고 이 폴더를 push 한 뒤, `dev` 브랜치를 만들어 기본 브랜치로 지정한다
   ```bash
   git init && git add . && git commit -m "chore: 프로젝트 초기 세팅"
   git branch -M main && git remote add origin https://github.com/<팀>/<저장소>.git && git push -u origin main
   git switch -c dev && git push -u origin dev
   ```
2. 프론트 lock 파일과 shadcn/ui 설정을 만들어 커밋한다 (이후 팀원은 이 파일들을 그대로 받는다)
   ```bash
   cd frontend
   node -v                       # v22.x 인지 확인 (아니면 아래 '1. 사전 설치' 의 Node 항목)
   npm install                   # package-lock.json 생성
   npx shadcn@latest init        # components.json · src/lib/utils.js · index.css 테마 생성
   npx shadcn@latest add button  # (확인용) 컴포넌트 하나 추가
   cd ..
   git add . && git commit -m "chore: 프론트 lock 파일 · shadcn 초기 설정" && git push
   ```
3. 저장소 Settings 에서
   - **Branches**: `main` · `dev` 보호 규칙 (PR 필수, `backend / test` · `frontend / check` 통과 필수). 팀원 이름 브랜치는 보호하지 않는다 ([브랜치 전략](#브랜치-전략))
   - **General > Pull Requests**: "Allow merge commits" 만 켜고 Squash · Rebase merging 은 끈다 (이름 브랜치를 계속 쓰기 때문)
   - **Environments**: `dev` · `prod` 생성 (아래 [CI/CD](#cicd))
   - **Collaborators**: 팀원 5명 초대
   - **Secrets and variables > Actions**: 아래 [CI/CD](#cicd) 표의 값 (배포 단계가 되면)

## 1. 팀원 PC 사전 설치 (최초 1회)

| 도구 | 비고 |
|---|---|
| Git | Windows 는 설치 중 "Checkout as-is, commit Unix-style" 권장 |
| Docker Desktop | Windows 는 WSL2 모드. **실행해 둔 상태**여야 compose · 테스트가 돈다 |
| JDK 21 (Temurin) | Gradle 을 띄우는 용도. 버전이 달라도 빌드는 toolchain 이 21 로 맞춘다 |
| VS Code | 저장소 **맨 위 폴더**(`Nansogong`)를 연다 → 오른쪽 아래 "추천 확장 설치" 알림에서 모두 설치 (`.vscode/extensions.json`). IntelliJ 를 쓰는 팀원은 `backend` 폴더를 연다 |
| Node.js 22 | 다른 프로젝트 때문에 여러 버전이 필요 없으면 [nodejs.org](https://nodejs.org) 에서 22 LTS 를 바로 설치하면 끝. 여러 버전이 필요하면 Mac 은 `nvm`, Windows 는 `nvm-windows` (`winget install CoreyButler.NVMforWindows` → 새 터미널에서 `nvm install 22` → `nvm use 22`, 관리자 권한 터미널) |

## 2. 실행 (클론 후 처음)

```bash
git clone https://github.com/<팀>/<저장소>.git
cd <저장소>

cp .env.example .env              # Windows PowerShell: copy .env.example .env
                                  # .env 의 ANTHROPIC_API_KEY 주석을 풀고 각자 키 입력 (없으면 AI 기능만 실패)

docker compose up -d              # 서버(8080) + PostgreSQL(5432) + Redis(6379) + 외부 연동 목업(8089)
                                  # 처음엔 서버 이미지를 빌드하느라 몇 분 걸린다
docker compose ps                 # app · postgres · redis 가 healthy 면 준비 완료
docker compose logs -f app        # 서버 로그 (Ctrl+C 로 나가도 서버는 계속 돈다)
```

서버도 컨테이너로 뜨므로 **JDK · VS Code 설정 없이 위 명령만으로 서버가 켜집니다.** backend 코드를 바꾼 뒤 `docker compose up -d` 를 다시 하면 바뀐 코드로 다시 빌드됩니다.

**서버 코드를 고치며 디버깅할 때** (중단점 · 빠른 재시작이 필요할 때)

- **VS Code (권장)**: 왼쪽 "실행 및 디버그"(Ctrl+Shift+D) → **`서버 (Spring Boot, 8080)`** 또는 **`서버 + 화면 같이 켜기`** → ▶ (F5)
  컨테이너 서버는 자동으로 멈추고 DB · Redis · 목업만 띄운 뒤 VS Code 에서 서버를 켠다. 처음엔 왼쪽 아래 `Java: Ready` 까지 기다린다
- **터미널**: `docker compose stop app` → `cd backend` → `.\gradlew bootRun` (Mac: `./gradlew bootRun`)
- 디버깅이 끝나고 다시 컨테이너 서버로: `docker compose up -d`

화면(프론트)은 터미널에서

```bash
cd frontend
node -v                           # v22.x 인지 확인
                                  # (nvm 사용자: Mac 은 nvm use / Windows nvm-windows 는 .nvmrc 를 못 읽으므로 nvm use 22)
npm ci                            # 🚨 npm install 이 아니라 npm ci (lock 파일 그대로 설치)
npm run dev                       # 화면 5173
```

**http://localhost:5173/dev** 에 서버 · PostgreSQL · Redis · 외부 연동 목업 네 줄이 모두 `연결됨` 이면 세팅 완료 ✅
(화면 라우터가 들어오면서 연결 확인판은 `/` 가 아니라 `/dev` 로 옮겼습니다)

### 화면만 둘러보기 (서버 없이)

대부분의 화면은 각 영역의 예시 데이터로 그려지므로 **`npm run dev` 만으로** 둘러볼 수 있습니다. **회원가입·로그인·사업자 확인·매장 설정은 실제 백엔드와 DB를 사용**하므로 `docker compose up -d`로 서버도 켜야 합니다. 휴대전화는 서버의 개발용 인증번호 `000000`을 사용하며 실제 문자는 발송하지 않습니다. 가입·인증의 상세 조건은 [백엔드 계약](docs/rules/backend.md#회원가입--로그인--매장-저장)을 따릅니다. 새로고침하면 로그인은 풀리지만 회원·매장 정보는 DB에 남습니다.

```bash
cd frontend
npm ci                            # 처음 한 번, 또는 package-lock.json 이 바뀐 날
npm run dev                       # → http://localhost:5173/screens
```

- **http://localhost:5173/screens**: Figma 프레임 번호 순 전체 화면 목록입니다. 누르면 그 화면으로 갑니다. `:id` 가 있는 화면은 예시 id(`o1`, `milk` 등)로 열립니다.
- 브라우저 개발자 도구의 모바일 보기(폭 360px)로 확인합니다. 화면은 가운데 최대 430px 폭으로 그려집니다.
- 화면 목록과 주소는 `frontend/src/routes.js` 의 `ROUTES` 한 곳에서 관리합니다. 새 화면은 여기에 `['Figma 번호 이름', '/경로', 컴포넌트, 'UF-xx']` 한 줄을 추가합니다.
- 서버 API 가 생기면 각 영역 `queries.js` 의 `queryFn` 만 `api.js` 호출로 바꿉니다. 화면 코드는 그대로 둡니다.

재고 · 발주 · 입고 · 메뉴 · 승인 이력 화면

| 영역 | 주요 화면 | 주소 |
|---|---|---|
| 재고 (UF-09 ~ 11) | 재고 목록 · 품목 상세 · 품목 등록 · 실사 · 폐기 | `/inventory`, `/inventory/items/milk`, `/inventory/adjust` |
| 발주 추천 (UF-12) | 발주 추천 · 가격 비교 · 조건 수정 | `/orders/recommendation`, `/orders/recommendation/compare` |
| AI 대신 주문 (UF-13) | 24-6 대신 주문 설정, 24-7 AI 대신 주문 진행 · 완료 | `/settings/agent-order`, `/orders/agent` |
| 발주 상태 (UF-13) | 발주 목록 · 발주 상태 · 직접 주문 등록 | `/orders`, `/orders/o1`, `/orders/o1/direct` |
| 입고 · 정정 (UF-14) | 입고 확인 · 정정 요청 | `/receiving`, `/corrections/new` |
| 메뉴 (UF-15, 16) | 메뉴 · 레시피 편집 · 판매 분석 · AI 메뉴 추천 | `/menu`, `/menu/analysis`, `/menu/recommendations` |
| 승인 · 실행 이력 (UF-19, 20) | 실행 결과 · 재승인 · 반려 · 보류 | `/results`, `/reapproval/o2`, `/on-hold` |

| 주소 | 용도 |
|---|---|
| http://localhost:5173 | 화면 (CORS 때문에 꼭 이 주소로) |
| http://localhost:5173/screens | 전체 화면 목록 (개발용 바로가기) |
| http://localhost:5173/dev | 서버 · DB · Redis · 목업 연결 확인판 |
| http://localhost:8080/api/ping | 서버 · DB · Redis 연결 상태 |
| http://localhost:8080/swagger-ui/index.html | API 문서 |
| http://localhost:8080/actuator/health | 서버 상태 |
| http://localhost:8089/__admin/requests | 목업이 받은 요청 기록 (내 서버가 외부에 뭘 보냈는지) |

## 3. 매일 하는 일

```bash
git pull
docker compose up -d              # 서버 코드 · compose 파일이 바뀌었으면 알아서 다시 빌드 · 새로 띄운다
cd frontend && npm ci             # package-lock.json 이 바뀐 날만
```

- 테스트: `backend` 폴더에서 `./gradlew test` (Testcontainers 가 테스트용 PostgreSQL · Redis 를 따로 띄운다. Docker Desktop 실행 필요)
- 수요 예측 실험: `docker compose --profile ml up -d --build` → http://localhost:8888 (`ml/README.md`)
- 배포 모양 화면 확인 (nginx · PWA): `docker compose --profile web up -d --build` → http://localhost:8000
- 데모 데이터 넣기: `bash infra/demo-data/load.sh local` (`infra/demo-data/README.md`)
- 모니터링 확인: `docker compose --profile monitoring up -d` → Prometheus http://localhost:9090 · Grafana http://localhost:3000 (admin/admin)
- DB 를 처음 상태로: `docker compose down -v && docker compose up -d`

## 4. 환경을 바꿀 때 규칙

환경 변경도 **코드처럼 PR 로** 합니다. 머지되면 팀원은 `git pull` 만 하면 같은 환경이 됩니다.

| 바꾸는 것 | 함께 바꿀 곳 |
|---|---|
| PostgreSQL · Redis 버전 | `docker-compose.yml` + `backend/src/test/.../TestcontainersConfig.java` + 운영 RDS · ElastiCache |
| 새 환경변수 | `.env.example` + `application.yml`(로컬 기본값) + `application-aws.yml` + `infra/secrets/README.md` 키 목록 · 틀 파일 + Secrets Manager(dev · prod 둘 다) |
| 엔티티 추가 · 수정 | `backend/src/main/resources/db/migration/V<연월일시분>__설명.sql` (예: `V202611201430__create_store.sql`). 🚨 머지된 파일은 고치지 않고 새 파일로 |
| 외부 API 응답 모양 | `mock/mappings/*.json` (목업도 같은 PR 에서 함께 고친다) |
| `app.*` 설정 추가 | `application.yml` + `common/AppProperties.java` (+ AWS 값이면 `application-aws.yml`) |
| 라이브러리 추가 | `backend/build.gradle` / `frontend/package-lock.json` (npm install 후 lock 파일 커밋) |
| Node 버전 | `.nvmrc` (Actions 도 이 파일을 읽는다) |

## 5. 자주 나는 문제

| 증상 | 해결 |
|---|---|
| `port is already allocated` (5432 · 6379 · 8089) | PC 에 이미 깔린 PostgreSQL/Redis 를 끄거나, `.env` 에서 `DB_PORT=5433` · `MOCK_PORT=8090` 처럼 바꾼다 |
| 서버 시작 시 `Validation failed for object='app'` | `application.yml` 의 `app.*` 값이 비었다. AWS 라면 Secrets Manager 에 그 키가 빠진 것 |
| 서버 시작 시 Flyway `Validate failed` | 머지된 마이그레이션 파일을 고쳤다 → 되돌리고 새 파일로. 로컬 DB 만 꼬였으면 `docker compose down -v` |
| 서버 시작 시 `Schema-validation: missing table` | 엔티티만 만들고 마이그레이션 SQL 을 안 만들었다 |
| 화면에 "서버에 연결할 수 없습니다" | 서버(8080)가 켜져 있는지, 화면 주소가 `localhost:5173` 인지 확인 |
| `Could not find a valid Docker environment` (테스트) | Docker Desktop 을 실행한다 |
| `./gradlew: Permission denied` | `chmod +x backend/gradlew` |
| 화면에서 서버 연결 실패 · 8080 이 안 열림 | `docker compose ps` 에서 app 상태 확인. 안 떴으면 `docker compose logs app` 의 오류를 본다 |
| VS Code 로 서버 실행 시 `Port 8080 was already in use` | 컨테이너 서버가 켜져 있다. `docker compose stop app` 후 다시 실행 (VS Code 실행 버튼은 자동으로 멈춘다) |
| 코드를 고쳤는데 컨테이너 서버에 반영이 안 됨 | `docker compose up -d` 를 다시 실행 (안 되면 `docker compose up -d --build app`) |
| VS Code 에서 `NansogongApplication` 에 빨간 줄 · 실행 목록에 서버가 없음 | Java 확장이 아직 프로젝트를 불러오는 중이거나 JDK 21 이 없다. 왼쪽 아래 `Java: Ready` 확인, 안 되면 Ctrl+Shift+P → `Java: Clean Java Language Server Workspace` |
| `ConflictingBeanDefinitionException: ... bean name 'xxx'` (같은 이름의 클래스가 두 패키지에) | 파일을 옮긴 뒤 **옛 위치의 파일이나 옛 빌드 결과물**이 남은 것. 옛 파일을 지우고 `gradlew clean` 후 다시 실행 |
| `Task 'bootRun' not found` · `gradlew` 를 찾을 수 없음 | 저장소 맨 위가 아니라 `backend` 폴더에서 실행한다 |
| Windows 에서 `gradlew` 가 `\r` 오류 | `.gitattributes` 가 막아 주지만, 이미 받은 파일이면 `git rm --cached -r . && git reset --hard` |
| `npm ci` 가 lock 파일 불일치로 실패 | `package.json` 만 고치고 lock 을 안 올린 경우 → 고친 사람이 `npm install` 후 lock 커밋 |
| EC2 에서 `exec format error` | 내 PC(amd64)에서 직접 만든 이미지. AWS 서버는 Graviton(arm64)이라 Actions 가 arm64 로 만든 이미지만 쓴다 |

## 환경 구성: local / dev / prod

| | local (내 PC) | dev (AWS 서울) | prod (AWS 서울) |
|---|---|---|---|
| 누가 쓰나 | 개발자 각자 | 팀 전체 통합 확인 · QA | 실제 사장님 |
| 언제 바뀌나 | 내 마음대로 | `dev` 에 머지될 때 | `main` 에 머지 + 승인될 때 |
| 구성 | docker compose | EC2 t4g.small 1대 + docker compose (화면 nginx 포함) | CloudFront · ALB · WAF · ASG(Graviton) · NAT (`infra/cloudformation`) |
| Spring 프로필 | (기본) `application.yml` | `dev` | `aws,prod` |
| DB · Redis | docker compose | 같은 EC2 의 컨테이너 | prod 전용 RDS Multi-AZ · ElastiCache 2노드 |
| 환경변수 | `.env` | Secrets Manager `nansogong/dev` → `.env` (`infra/dev/update.sh`) | Secrets Manager `nansogong/prod` · `nansogong/prod/db` |
| Swagger · 상세 로그 | 켜짐 | 켜짐 | 꺼짐 |

설정 파일은 겹쳐 쓰는 구조입니다. `application.yml`(로컬 기본값) ← `application-aws.yml`(prod, 기본값 없음) ← `application-dev.yml` / `application-prod.yml`.
dev 는 비용을 줄이려고 로컬과 같은 docker compose 구성을 EC2 한 대에 올린 것이라 `aws` 프로필을 쓰지 않습니다. 그래서 RDS · ElastiCache · ALB 처럼 prod 에서만 쓰는 것은 dev 에서 확인되지 않습니다 (`infra/README.md`).
AWS 에서 환경변수가 하나라도 빠지면 서버가 뜨지 않습니다. 로컬 기본값으로 조용히 떠서 엉뚱한 DB 를 보는 사고를 막기 위해서입니다.

## 브랜치 전략

각자 **자기 이름 브랜치 하나**에서 계속 작업하고, PR 로 `dev` 에 합칩니다.

```
kyeongmo ─┐
jpyo     ─┼──PR──▶  dev  ──PR──▶  main
<이름>    ─┘        (dev 배포)     (승인 후 prod 배포)
```

| 브랜치 | 누가 · 어떻게 | 배포 |
|---|---|---|
| `<영문 이름>` (예: `kyeongmo`, `jpyo`) | 본인만 push. 다른 사람 이름 브랜치에는 push 하지 않는다 | 없음 (PR 테스트만) |
| `dev` | PR 로만 머지 (직접 push 금지) | dev 서버 |
| `main` | `dev` → `main` PR 로만 머지 | 승인 후 prod |

**내 브랜치 처음 만들기** (이미 있으면 건너뛴다)

```bash
git switch dev && git pull
git switch -c <내 이름> && git push -u origin <내 이름>
```

**작업할 때마다**

1. 시작 전에 `dev` 의 최신 내용을 내 브랜치로 받는다 (다른 팀원이 머지한 것 · 환경 변경)
   ```bash
   git switch <내 이름>
   git fetch origin && git merge origin/dev
   ```
2. 작업 · 커밋 → `git push`
3. GitHub 에서 **`<내 이름>` → `dev`** PR 을 올린다. 테스트(`backend / test` · `frontend / check`) 통과 + 팀원 1명 확인 후 머지
4. 머지 후에도 브랜치는 지우지 않고 계속 쓴다. 다음 작업은 다시 1번부터

**규칙**

- PR 은 기능 하나 단위로 작게 올린다. 한 브랜치에 오래 쌓아 두면 다른 팀원 작업과 충돌이 커진다
- 🚨 PR 은 **Create a merge commit** 으로 머지한다. 이름 브랜치는 계속 쓰는 브랜치라 Squash 로 머지하면 다음 PR 에 이미 머지한 커밋이 다시 나오고 충돌이 생긴다
- 🚨 이미 push 한 커밋은 `rebase` · `push --force` 하지 않는다 (`dev` 를 받을 때는 `merge`)
- dev 서버에서 확인이 끝나면 `dev` → `main` PR 을 올린다. 같은 코드면 **dev 에서 쓴 이미지를 그대로 prod 에 배포**한다 (다시 빌드하지 않음)
- 운영 긴급 수정은 `main` 에서 `hotfix/<내용>` 을 따서 `main` 에 PR 로 머지하고, 바로 `main` → `dev` PR 로 `dev` 에도 반영한다

## CI/CD

| 워크플로 | PR | `dev` 머지 | `main` 머지 |
|---|---|---|---|
| `backend.yml` | 테스트 | 테스트 → arm64 이미지 빌드 → ECR → dev EC2 갱신 (SSM) | 테스트 → (같은 이미지 재사용) → 승인 → CodeDeploy 로 prod ASG 한 대씩 교체 |
| `frontend.yml` | lint + build | nginx 화면 이미지 빌드 → ECR → dev EC2 갱신 (SSM) | build → 승인 → prod S3 · CloudFront |

AWS 키는 저장하지 않습니다. Actions 가 OIDC 로 역할을 잠깐 빌려 씁니다 (역할은 CloudFormation 스택이 만든다: [`infra/README.md`](infra/README.md)).

**저장소 Settings > Secrets and variables > Actions > Variables** (공통)

| 이름 | 값 |
|---|---|
| `AWS_BUILD_ROLE_ARN` | ECR 에 이미지를 올리는 역할 ARN (`dev` · `main` 브랜치만 쓸 수 있다) |

**저장소 Settings > Environments** → `dev`, `prod` 두 개를 만들고 각각 입력

| 환경 | 이름 | 값 (스택 출력값) |
|---|---|---|
| dev · prod | `AWS_DEPLOY_ROLE_ARN` | 그 환경 전용 배포 역할 ARN |
| dev | `DEV_INSTANCE_ID` | `nansogong-dev` 스택의 `InstanceId` |
| prod | `CODEDEPLOY_APP` · `CODEDEPLOY_GROUP` · `ARTIFACT_BUCKET` | `nansogong-prod` 스택의 CodeDeploy 이름 · 배포 묶음 버킷 |
| prod | `WEB_BUCKET` · `CF_DISTRIBUTION_ID` | 같은 스택의 화면 S3 버킷 · CloudFront 배포 ID |

`prod` 환경에는 **Required reviewers** 와 **Deployment branches: `main` 만** 을 설정한다.

롤백: Actions 에서 예전 성공 실행(`main`)을 열어 **Re-run all jobs** (이미지가 ECR 에 있으므로 빌드 없이 그 버전으로 다시 배포한다). CodeDeploy 는 배포가 실패하면 직전 버전으로 자동 롤백한다

AWS 쪽 준비 · 생성 · 삭제(CloudFormation, IAM 역할, Secrets Manager, 데모 데이터)는 [`infra/README.md`](infra/README.md) 를 본다.

## 아직 정하지 않은 것 (요구사항 · 유저 플로우에서 확인)

개발 환경은 아래를 **어느 쪽으로 정해도 바꾸지 않아도 되게** 만들어 두었습니다. 정해지면 이 표를 고쳐 주세요.

| 항목 | 현재 상태 | 영향 |
|---|---|---|
| 쿠폰 발행 방식 | **POS 역동기화**로 기능 흐름 확정 ([유저 플로우 1.04](docs/pjt_source/유저_플로우_1.04.md) "확정한 적용 기준"). POS 지원 범위는 연동 검증 필요 | 목업에 POS 쿠폰 등록(`/pos/v1/coupons`)은 넣어 둠 |
| 수요 예측 모델 실행 방식 | **FastAPI 예측 API**로 방향 결정 ([아키텍처 수요 예측](docs/rules/architecture.md#수요-예측)). 구현 전 | `ml/` 에서 학습 · 검증한 모델을 FastAPI가 불러오고, Spring이 결과를 검증 · 저장 |
| AWS 에서 목업 서버 위치 | dev 는 EC2 의 compose 에 함께 뜬다. **prod 는 미정** | prod 서버가 뜨려면 `nansogong/prod` 에 `POS_BASE_URL` 등이 필요. 서버 EC2 에 함께 띄우기 / 별도 서비스 중 선택 |
| 차트 라이브러리 | 기술 스택에 없음 | 매출 그래프에 필요. 예: Recharts(shadcn/ui charts). (화면 이동 라우터는 `react-router-dom` 으로 정함) |
| 알림 방식 | 재고 부족 · 입고 확인 · 주간 실사 알림 (구현-3-6 ~ 3-8, 3-13) | 앱 안 알림 목록만이면 추가 설정 없음. PWA 푸시면 VAPID 키 · 서비스워커 설정 추가 |
| 정정 요청 증빙 사진 (구현-3-14) | 업로드 포함 여부 확인 필요 | 포함하면 S3 버킷 · 업로드 권한 추가 |
| 앱 → POS 메뉴 역동기화 (구현-4-1) | 팀 논의 예정 | 정하면 목업에 POS 메뉴 등록 스텁 추가 |
