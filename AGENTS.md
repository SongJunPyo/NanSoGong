# AGENTS.md

AI 코딩 도구(Claude Code · Codex · Cursor 등)가 이 저장소에서 작업할 때 **매번 먼저 읽고 지키는 규칙**입니다.
자세한 배경은 아래 기준 문서에 있고, 이 파일은 그중 "코드를 쓸 때 꼭 지킬 것"만 모았습니다.
규칙이 서로 다르면 **사용자의 직접 지시 > 이 파일 > 기준 문서** 순서로 따릅니다.

> 규칙은 **이 파일 하나에만** 씁니다. `CLAUDE.md` 는 Claude Code 가 이 파일을 불러오게 하는 한 줄짜리 연결 파일이므로 내용을 추가하지 않습니다. (Codex 는 이 파일을 바로 읽습니다.)

## 0. 프로젝트 한 줄 요약

**난소공**: 소상공인 사장님용 AI 매장 운영 에이전트 (PWA). 5인 팀, 수업 실습 저장소 [WONIT-A/07_cicd](https://github.com/WONIT-A/07_cicd) 구조를 따릅니다.

| 영역 | 기술 |
|---|---|
| FE | React 19, Vite, vite-plugin-pwa, Tailwind CSS v4, shadcn/ui, TanStack Query, Zustand (JavaScript · JSX, TypeScript 아님) |
| BE | Java 21, Spring Boot 4, Spring Security + JWT, Spring Data JPA, Flyway, ShedLock, PostgreSQL 17, Redis |
| AI | Claude API (Spring AI ChatClient), `ml/` 수요 예측 (Python · LightGBM) |
| Infra | Docker Compose(로컬), AWS (CloudFormation · ECR · CodeDeploy), GitHub Actions |

### 기준 문서 (작업 전 관련 부분을 읽는다)

| 문서 | 언제 보나 |
|---|---|
| [WONIT-A/07_cicd](https://github.com/WONIT-A/07_cicd) | **구조의 기준.** 새 패키지 · 폴더 · 클래스를 만들 때 같은 계층의 파일 모양을 먼저 참고한다 (백엔드 `src/main/java/com/example/wonit/`, 프론트 `frontend/src/`, 테스트 `src/test/…/TransferFlowTest.java`, 프롬프트 `src/main/resources/prompts/`) |
| [README.md](README.md) | 실행 방법, 환경 변경 규칙, 브랜치 전략, 자주 나는 문제 |
| [docs/notice/2026-11-23-개발-시작-안내.md](docs/notice/2026-11-23-개발-시작-안내.md) | 패키지 · 폴더 구조, 계층별 코드 규칙, 도메인 담당 |
| [docs/notice/2026-11-23-2주-구현-계획서.md](docs/notice/2026-11-23-2주-구현-계획서.md) | 일자별 할 일 · 완료 기준, 2주 범위 / 3주차로 넘긴 것 |
| `docs/pjt_source/유저_플로우_1.01.md`, `요구사항정의서_수정본1.1.xlsx` | 기능의 요구사항 번호(구현-x-y) · 유저 플로우(UF-xx) |
| [docs/changes/](docs/changes/README.md) | 환경 · 구조 변경 이력 |

---

## 1. 작업 원칙

- **요청받은 범위만 고친다.** 관련 없는 리팩터링 · 포맷 변경 · 파일 이동을 끼워 넣지 않는다.
- **다른 도메인 코드는 직접 고치지 않는다.** 필요하면 그 도메인의 service 메서드를 부르고, 없으면 사용자에게 "○○ 담당에게 요청 필요"라고 알린다. (담당은 [7장](#7-도메인--담당))
- **공용 파일은 고치기 전에 사용자에게 먼저 확인한다**: `common/`, `frontend/src/api/client.js`, `frontend/src/components/ui/`, `docker-compose.yml`, `backend/build.gradle`, `frontend/package.json`, `.github/workflows/`
- 2주 범위 밖 기능(구현 계획서 7장)은 요청이 없으면 만들지 않는다.
  - 11/24 계약 회의에서 추가로 뺀 것: **운영 일정, 알림 설정, 사업자 진위확인, 콤보 · 세트** → 3주차 (화면이 필요하면 프론트 목업으로 대체).
  - 인프라는 이번 2주 동안 **dev 환경만**. 운영 배포는 3주차.
- 모르는 것(표 칸 이름, API 모양, 미정 사항)은 추측해서 만들지 말고 질문하거나, 가정을 코드 주석 · 답변에 분명히 적는다.
- 작업이 끝나면 **무엇을 확인했는지**(테스트 · lint · 빌드 결과)를 그대로 보고한다. 실행하지 않은 검증을 "통과"라고 말하지 않는다.

---

## 2. 명명 규칙 (Naming Convention)

### 2-1. Java (백엔드)

| 구분 | 표기법 | 예시 | 비고 |
|---|---|---|---|
| 파일명 · 클래스 · 인터페이스 · record · enum | PascalCase | `InventoryService.java`, `InventoryItemResponse` | 파일명 = public 클래스명 |
| 변수 · 메서드 · 파라미터 | camelCase | `storeId`, `checkOwner()`, `todaySummary()` | |
| 상수 · enum 값 | UPPER_SNAKE_CASE | `MAX_RETRY_COUNT`, `ApprovalStatus.PENDING` | |
| 패키지 | 모두 소문자, 단어 하나 | `com.nansogong.service` | 대문자 · `_` · `-` 금지 |
| 에러 코드 문자열 | UPPER_SNAKE_CASE | `"INVENTORY_ITEM_NOT_FOUND"` | `BusinessException` 의 `code` |

- 🚨 **kebab-case(`-`)는 Java 식별자에 쓸 수 없다** (뺄셈 연산자로 해석되어 컴파일 에러).
- **클래스 이름 앞에 도메인 이름을 붙인다** (같은 폴더를 여러 명이 써도 파일이 겹치지 않게).

  | 도메인 | 접두사 | URL |
  |---|---|---|
  | 회원 · 인증 | `Auth…`, `Member…` | `/api/auth/**`, `/api/me` |
  | 매장 | `Store…` | `/api/stores/**` |
  | 연동 | `Integration…`, `Pos…` | `/api/stores/{storeId}/integrations/**` |
  | 날씨 | `Weather…` | `/api/stores/{storeId}/weather` |
  | 홈 | `Home…` | `/api/stores/{storeId}/home/**` |
  | 쿠폰 | `Coupon…` | `/api/stores/{storeId}/coupons/**` |
  | 재고 | `Inventory…` | `/api/stores/{storeId}/inventory-items/**` |
  | 발주 · 입고 | `Purchase…` | `/api/stores/{storeId}/purchase-orders/**` |
  | 메뉴 | `Menu…` | `/api/stores/{storeId}/menus/**` |
  | 매출 · 비용 | `Sales…`, `Expense…` | `/api/stores/{storeId}/sales/**` |
  | 에이전트 · 승인 | `Agent…`, `Approval…` | `/api/stores/{storeId}/agent/**` |

- 계층별 접미사: `XxxController`, `XxxService`, `XxxRepository`, 엔티티는 접미사 없이 `InventoryItem`, DTO 는 `XxxCreateRequest` · `XxxUpdateRequest` · `XxxResponse`, 예외는 `XxxNotFoundException` 처럼 업무 이름 + `Exception`.

### 2-2. kebab-case · snake_case 를 쓰는 곳 (Java 코드 밖)

| 대상 | 표기법 | 예시 |
|---|---|---|
| REST URL 경로 | kebab-case, 복수 명사 | `/api/stores/{storeId}/purchase-orders` |
| Spring 설정 키 · 설정 파일명 | kebab-case | `app.jwt.access-ttl`, `application-dev.yml` |
| 리소스 · 프롬프트 파일 | kebab-case | `prompts/agent-plan.st`, `user-profile.png` |
| DB 표 · 칸 | snake_case (소문자) | `inventory_item`, `store_id`, `created_at` |
| Flyway 파일 | `V<연월일시분>__<snake_case 설명>.sql` | `V202611241030__create_member_store.sql` |
| 환경변수 | UPPER_SNAKE_CASE | `ANTHROPIC_API_KEY`, `JWT_SECRET` |
| JSON 요청 · 응답 필드 | camelCase (Jackson 기본) | `{ "storeId": 1, "unitPrice": 1200 }` |
| 쿼리 파라미터 | camelCase | `?from=2026-11-01&groupBy=week` |
| 문서 파일 (`docs/`) | `연-월-일-짧은-설명.md` | `2026-11-23-개발-시작-안내.md` |

### 2-3. 프론트엔드 (JavaScript · React)

| 대상 | 표기법 | 예시 |
|---|---|---|
| 컴포넌트 파일 · 컴포넌트 이름 | PascalCase `.jsx` | `InventoryPage.jsx`, `InventoryItemRow.jsx` |
| 화면(페이지) 컴포넌트 | `XxxPage.jsx` | `LoginPage.jsx` |
| 훅 | `useXxx` camelCase `.js` | `useInventoryItems.js`, `useAuthStore.js` |
| api 파일 | 도메인 이름 소문자 `.js` | `api/inventory.js`, `api/auth.js` |
| 변수 · 함수 | camelCase | `getItems()`, `selectedStoreId` |
| 상수 | UPPER_SNAKE_CASE | `DEFAULT_PAGE_SIZE` |
| 도메인 폴더 | 소문자 | `components/inventory/` |
| shadcn 부품 (`components/ui/`) | shadcn 이 만든 이름 그대로 (kebab-case 소문자) | `button.jsx` |

---

## 3. 백엔드 규칙

### 3-1. 패키지 구조 (07_cicd 와 같은 계층별)

> [07_cicd](https://github.com/WONIT-A/07_cicd) 의 `src/main/java/com/example/wonit/` 와 같은 계층별 구조입니다 (2026-11-23 구조 정리 PR 에서 기능별 패키지 `auth/` · `inventory/` … 를 없앴습니다).
> - **기능별 패키지(`com.nansogong.inventory` 등)를 새로 만들지 않는다.** 도메인은 패키지가 아니라 클래스 이름 접두사로 나눈다 ([2-1](#2-1-java-백엔드)).
> - 아래 패키지 말고 새 패키지가 필요해 보이면 먼저 07_cicd 에 같은 역할의 패키지가 있는지 확인하고, 없으면 만들기 전에 사용자에게 묻는다.
> - 클래스 모양이 애매하면 07_cicd 의 같은 계층 파일(`AccountController`, `AccountService`, `Account`, `AccountResponse`, `AccountNotFoundException`, `BankTools` 등)을 참고한다.

```
backend/src/main/java/com/nansogong/
├── common/       설정 · 보안 · 공통 처리 (SecurityConfig, ExternalApiConfig, AppProperties, GlobalExceptionHandler …)
├── controller/   URL 을 받아 service 호출
├── service/      업무 규칙 · 계산 · @Transactional
├── repository/   JPA Repository
├── model/        @Entity
├── dto/          요청 · 응답 record
├── exception/    BusinessException + 업무 예외
└── ai/           Spring AI (ChatClient 설정, @Tool 클래스)
backend/src/main/resources/
├── db/migration/ Flyway SQL
└── prompts/      AI 프롬프트 (*.st)
```

### 3-2. 계층별 규칙

| 계층 | 규칙 |
|---|---|
| Controller | 로직 없이 service 호출 · DTO 변환만. 토큰 주인은 `@AuthenticationPrincipal Jwt jwt` → `jwt.getSubject()` |
| REST | URL 은 명사, 동작은 HTTP 메서드. 생성 `201`, 삭제 `204`, 목록은 `Page<>` |
| DTO | `record` + `static from(Entity)`. **Entity 를 그대로 응답하지 않는다** |
| 검증 | 요청 DTO 에 `@NotNull` · `@Positive` 등 + Controller 에서 `@Valid` |
| Entity | `@Data` 금지, `@Getter` 사용. 값 변경은 setter 대신 업무 메서드(`approve()`, `cancel()`) |
| 돈 | `BigDecimal`, DB 는 `DECIMAL(19,2)`. 비교는 `compareTo` (`equals` 금지) |
| 예외 | `BusinessException(HttpStatus, code, message)` 를 상속한 업무 예외만 추가한다. **`GlobalExceptionHandler` 는 고치지 않는다** |
| 로그 | `@Slf4j`, `log.info("… {}", 값)`. 문자열 `+` 연결 금지. 개인정보 · 토큰 로그 금지 |
| 매장 분리 | 모든 업무 표에 `store_id`. 서비스 맨 앞에서 `StoreService.checkOwner(memberId, storeId)` 로 내 매장인지 확인 (남의 매장 → 403) |
| 다른 도메인 | 다른 도메인의 repository · Entity 를 직접 쓰지 않고 그 도메인의 **service 메서드**를 부른다 |
| 스케줄 | `@Scheduled` 에는 반드시 `@SchedulerLock` (서버 여러 대여도 한 번만). 시간대 Asia/Seoul |
| 외부 API | `common/ExternalApiConfig` 의 `xxxRestClient` 사용. 새 클라이언트를 따로 만들지 않는다 |

### 3-3. DB · Flyway

- 표는 **SQL 마이그레이션으로만** 만든다 (`ddl-auto: validate`). 엔티티만 만들고 SQL 을 빼먹지 않는다.
- 파일: `backend/src/main/resources/db/migration/V<연월일시분>__<설명>.sql`
- 🚨 **이미 머지된 마이그레이션 파일은 절대 고치지 않는다.** 변경은 새 파일로.
- D2(11/24) 계약 이후 공용 표(member · store · 판매 · 메뉴 · 품목) 칸 변경은 새 마이그레이션 + 사용자에게 "단톡 공유 필요" 안내.
- 새 표를 만들면 `infra/demo-data/` 에 데모 데이터 SQL 도 추가할지 사용자에게 묻는다.

### 3-4. 테스트

- 기능마다 **흐름 테스트 최소 1개** (07_cicd `TransferFlowTest` 처럼). Testcontainers 사용 → Docker 필요.
- AI 호출은 테스트에서 mock 으로 바꾼다 (실제 호출 = 과금).
- 실행: `cd backend && ./gradlew test`

### 3-5. 데이터 계약 (11/24 계약 회의 결정)

> 공용 표와 판매 → 재고 차감 연결의 약속입니다. 바꾸려면 새 마이그레이션을 만들고 사용자에게 "단톡 공유 필요"라고 안내한다 ([3-3](#3-3-db--flyway)).

#### 이름 · 타입

| 대상 | 규칙 |
|---|---|
| 표 · 칸 이름 | 표는 **단수** snake_case (`menu`, `sales_order_item`). PK 는 `id`, FK 는 `<표>_id` |
| JSON 키 | API 응답과 DB 의 JSONB 칸 안 모두 camelCase (`posMenuCode`). snake_case 는 DB 칸 이름에만 |
| ID | `BIGINT GENERATED ALWAYS AS IDENTITY` |
| 금액 | `DECIMAL(19,2)` / `BigDecimal` |
| 재고 · 레시피 수량 | `DECIMAL(19,3)` / `BigDecimal` (예: 18.5g) |
| 판매 수량 | `INTEGER` (잔 수는 정수) |
| 시간 | `TIMESTAMPTZ`. 매출 집계용 영업일은 한국 시간 기준 `business_date DATE` 칸을 따로 둔다 |
| 상태 값 | DB · API 는 영어 대문자 코드 (`NEEDS_FIX`). 한글 표시는 프론트가 바꾼다 (v0.7 문서의 한글 상태값도 코드로 바꿔 쓴다) |

#### 품목 · 단가 · 연동

- `unit` 값은 `G` · `ML` · `EA` 3개만.
- `pack_size` = 구매 단위 1개가 관리 단위로 얼마인지 (원두 1봉 = `1000` G).
- 단가는 항상 **관리 단위 1당 가격** (원두 1g당 25원). 단가 이력은 `item_cost` (예원), 현재 단가 캐시는 `item.unit_cost` (준표).
- `integration` 칸: `store_id`, `provider` (`TOSS_PLACE` · `OPEN_BANKING` · `SUPPLIER`), `status`, `external_store_id`, `auth_ref`, `last_synced_at`, `last_error`. **인증값 원문은 DB 에 넣지 않고** `.env` · Secrets 에만 둔다.

#### Flyway 머지 순서

① 예원 회원 · 매장 · 연동 → ② 준표 품목 → ③ 예원 메뉴 → ④ 경모 매출. 파일 이름의 시각도 이 순서로 맞춘다 (예: `V202611241000__…` → `…1100__…` → `…1300__…` → `…1400__…`).

#### 판매 항목 `sales_order_item`

- POS 원본 JSON 은 `sales_order.raw_payload` (JSONB) 에 **주문 단위로 통째로** 보관한다.

| 칸 | 타입 · 제약 | 뜻 |
|---|---|---|
| `sales_order_id` | `BIGINT NOT NULL` FK | 주문 |
| `line_no` | `INTEGER NOT NULL`, `UNIQUE (sales_order_id, line_no)` | POS 주문 안의 줄 번호 |
| `pos_menu_code` | `VARCHAR(100) NOT NULL` | POS 코드 원문 |
| `menu_id` | `BIGINT` FK, NULL 가능 | `resolve` 결과. 못 찾으면 NULL |
| `menu_name` | `VARCHAR(100) NOT NULL` | 판매 당시 이름 |
| `quantity` | `INTEGER NOT NULL CHECK (> 0)` | 판매 수량 |
| `canceled_quantity` | `INTEGER NOT NULL DEFAULT 0` | 누적 취소 수량 |
| `unit_price` | `DECIMAL(19,2) NOT NULL` | 메뉴 1개 가격 (옵션 제외) |
| `option_price` | `DECIMAL(19,2) NOT NULL DEFAULT 0` | 메뉴 1개당 옵션 가격 합 |
| `discount_amount` | `DECIMAL(19,2) NOT NULL DEFAULT 0` | 할인 |
| `amount` | `DECIMAL(19,2) NOT NULL` | 실제 결제된 줄 금액 |
| `options` | `JSONB NOT NULL DEFAULT '[]'` | 옵션 배열 (아래) |
| `deduct_status` | `VARCHAR(20) NOT NULL DEFAULT 'PENDING'` | 재고 차감 상태 (아래) |

`options` 모양 (키는 camelCase):

```json
[{ "code": "OPT_SHOT", "name": "샷 추가", "qty": 1, "price": 500, "menuId": 31 }]
```

| 키 | 뜻 | 채우는 사람 |
|---|---|---|
| `code` · `name` | POS 옵션 코드 원문 · 판매 당시 옵션 이름 | 경모 (저장할 때) |
| `qty` | **메뉴 1개당** 옵션 수량 | 경모 |
| `price` | 옵션 1개 가격 | 경모 |
| `menuId` | `resolve` 로 찾은 옵션 메뉴 (`parent_menu_id` 가 있는 메뉴). 못 찾으면 `null` | 예원 (`resolve` 결과) |

`deduct_status` 값: `PENDING` (저장만, 차감 전) · `DONE` (차감 완료) · `NEEDS_FIX` (메뉴 · 옵션 미매핑 또는 레시피 누락 → 연동 · 메뉴 화면에서 보완) · `SKIPPED` (재고를 쓰지 않는 메뉴).

#### 수량 · 계산 규칙

1. 옵션 `qty` 는 **잔당** 수량. 실제 옵션 수 = `quantity` × `qty` (아메리카노 2잔 + 샷 1 → 샷 2개).
2. 같은 메뉴 · 같은 옵션 조합이면 한 줄로 쓰고 `quantity` 를 늘린다. 옵션이 다르면 다른 줄.
3. 같은 옵션이 두 번 오면 하나로 합치고 `qty` 를 더한다 (샷 + 샷 → `qty: 2`).
4. `amount` = (`unit_price` + `option_price`) × `quantity` − `discount_amount`.
5. 차감 수량 = `quantity` − `canceled_quantity`.
6. 사용량 = Σ(기본 레시피 + 옵션 레시피 × `qty`) × 차감 수량. 단위는 품목의 관리 단위만 쓴다.
7. 메뉴나 옵션 코드가 매핑되지 않았으면 **차감하지 않고 `NEEDS_FIX`**. 매핑에서 '제외'로 정한 옵션(예: 얼음 적게)은 사용량 0 으로 정상 처리.
8. 취소는 **기존 행을 고치지 않는다.** `canceled_quantity` 를 늘리고 재고 장부에 '취소 환원'을 추가한다.
9. 중복 방지 키: 판매 차감 `SALE:{orderItemId}`, 취소 환원 `CANCEL:{orderItemId}:{누적취소수량}` (재처리해도 1번만 반영).
10. 콤보 · 세트는 이번 범위 밖. 들어오면 `NEEDS_FIX` 로 둔다 (3주차).

#### 도메인 사이 메서드 계약

| 담당 | 메서드 | 입력 → 출력 |
|---|---|---|
| 경모 | `SalesService.saveOrders(storeId, List<PosOrder>)` | POS 주문 저장. 같은 `external_order_id` 는 무시 |
| 예원 | `MenuService.resolve(storeId, posMenuCode, List<String> optionCodes)` | 코드 → `menuId` 와 옵션별 `menuId` (못 찾으면 null) |
| 예원 | `RecipeService.usageOf(menuId, List<OptionQty> options, at)` | **메뉴 1개 기준** 품목별 사용량 `Map<itemId, BigDecimal>` |
| 준표 | `InventoryService.deductForSale(orderItemId)` | `resolve` → `usageOf` × 차감 수량 → 장부 기록 → `deduct_status` 변경 |

- `usageOf` 는 메뉴 1개 기준만 돌려주고, **수량을 곱하는 것은 `deductForSale` (준표)** 가 맡는다. 취소 · 부분 취소가 생겨도 `usageOf` 는 바꾸지 않는다.

---

## 4. 프론트엔드 규칙

### 4-1. 폴더 구조 (07_cicd 와 같은 종류별)

> ⚠️ 지금의 `src/features/` 는 구조 정리 PR 에서 아래처럼 바뀝니다. 기준은 [07_cicd](https://github.com/WONIT-A/07_cicd) 의 `frontend/src/` (api · components · hooks · utils) 입니다.

```
frontend/src/
├── App.jsx
├── api/           서버 호출은 여기에만. client.js 의 request() 하나 + 도메인별 파일
├── components/
│   ├── ui/        shadcn/ui 부품 (공용)
│   ├── common/    하단 탭바 · 헤더 · 로딩 · 에러 표시
│   └── <도메인>/   XxxPage.jsx …
├── hooks/         useXxx (TanStack Query 훅 포함)
├── store/         Zustand (로그인 · 선택 매장)
├── utils/         format.js (금액 · 날짜)
└── lib/utils.js   shadcn 용 (건드리지 않음)
```

### 4-2. 코드 규칙

- **컴포넌트에서 `fetch` 직접 호출 금지.** 항상 `api/<도메인>.js` → `request()`.
- 서버 데이터는 TanStack Query. **`queryKey` 에 `storeId` 를 꼭 넣는다** (매장 전환 시 다른 매장 데이터 노출 방지).
- 로그인 토큰은 메모리(Zustand)에만. **`localStorage` · `sessionStorage` 에 토큰 저장 금지.**
- 에러는 `err.message` 를 그대로 보여 준다 (서버 `ErrorResponse.message` 가 사용자용 문구).
- **모바일 우선**: 폭 360px 에서 먼저 확인. 스타일은 Tailwind 클래스, 공통 부품은 shadcn/ui.
- 백엔드 API 가 아직 없으면 **짝과 합의한 JSON 예시를 return 하는 가짜 함수**로 `api/<도메인>.js` 를 먼저 만들고, API 가 생기면 `request()` 로 바꾼다.
- 금액 · 날짜 표시는 `utils/format.js` 를 쓴다 (직접 `toLocaleString` 흩뿌리지 않기).
- shadcn 부품 추가(`npx shadcn@latest add …`)는 사용자에게 알리고 PR 설명에 따로 표시한다.
- 확인: `cd frontend && npm run lint && npm run build`. 패키지 설치는 `npm ci` (lock 변경 시에만 `npm install` 후 lock 커밋).

---

## 5. AI 기능 규칙

| 원칙 | 내용 |
|---|---|
| 숫자는 코드가, 문장은 AI 가 | 할인 · 원가 · 발주 수량 · 손익 계산은 service 가 한다. AI 는 근거 · 문구만 |
| AI 는 실패할 수 있다 | `try-catch` + 대체값 · 안내 문구. AI 가 실패해도 기능은 동작해야 한다 |
| AI 답을 믿지 않는다 | 목록 · 스키마 검증. 실행 계획은 `.entity(XxxPlan.class)` 로 받고 검증 실패 시 저장하지 않는다 |
| 도구는 서버가 실행 | `@Tool` 클래스는 `memberId` · `storeId` 를 생성 시 고정. **승인된 계획 범위 안에서만** 실행 |
| 개인정보 미전송 | 매장 **집계값만** 보낸다. 이름 · 전화번호 · 사업자번호 금지 |
| 프롬프트는 파일로 | `resources/prompts/*.st` (코드에 긴 프롬프트 문자열 금지) |
| 비용 | 개발 중 기본 모델 `claude-haiku-5-5`. 연결 확인 API 는 `/api/ping` 에 넣지 않는다 |
| 역할 분리 | `ai/` (프롬프트 · ChatClient · `@Tool`) 는 AI 담당, 결과를 쓰는 API · 저장 · 검증은 도메인 백엔드 담당 |

---

## 6. 환경 · 보안 · Git

### 6-1. 비밀값

- API 키 · 비밀번호는 **`.env` 에만**. 코드 · `application*.yml` · 커밋 메시지 · 로그에 넣지 않는다.
- `.env` 는 커밋하지 않는다 (`.env.example` 만 커밋).
- 새 환경변수를 추가하면 함께 바꿀 곳: `.env.example` + `application.yml`(로컬 기본값) + `application-aws.yml` + `infra/secrets/README.md` 의 키 목록 · `*.example.json`. (`app.*` 설정이면 `common/AppProperties.java` 도)
- 외부 API 응답 모양을 바꾸면 `mock/mappings/*.json` 도 같은 PR 에서 고친다.

### 6-2. 브랜치

- 각자 **자기 이름 브랜치**에서 작업 → `dev` 로 PR → (확인 후) `main`.
- 시작 전 `git fetch origin && git merge origin/dev`.
- 🚨 **`rebase` · `push --force` · `dev`/`main` 직접 push 금지.** PR 은 **Create a merge commit** 으로만.
- **기능 하나 = PR 하나.**
- AI 도구는 **소기능이 끝날 때마다 커밋**한다 (아래 [커밋 단위](#커밋-단위-소기능마다-커밋)). **push 는 사용자가 요청할 때만** 한다.

### 6-3. 커밋 메시지

형식: `[TYPE]: subject` (예: `[FEAT]: 회원가입 API 추가`)

| 타입 | 사용 기준 | 예시 |
|---|---|---|
| `FEAT` | 새 기능 추가 · 기존 기능 확장 | `[FEAT]: 회원가입 API 추가` |
| `FIX` | 버그 수정 (긴급 수정 포함) | `[FIX]: 로그인 인증 오류 수정` |
| `REFACTOR` | 기능 변경 없는 구조 · 가독성 개선 | `[REFACTOR]: 인증 로직 분리` |
| `PERF` | 성능 개선 | `[PERF]: 게시글 조회 N+1 문제 개선` |
| `DOCS` | README · API 명세 등 문서 | `[DOCS]: API 명세 수정` |
| `TEST` | 테스트 추가 · 수정 | `[TEST]: 회원가입 단위 테스트 추가` |
| `STYLE` | 동작에 영향 없는 포맷 변경 | `[STYLE]: 코드 들여쓰기 통일` |
| `CHORE` | 빌드 · 의존성 · 환경 설정 · CI/CD | `[CHORE]: Gradle 의존성 추가` |

- 타입은 영문 대문자, 콜론 뒤 공백 한 칸.
- 제목은 50자 이내, 마침표 없이, `추가` · `수정` · `개선` · `제거` 같은 **명사형**으로 끝낸다.
- 한 커밋에는 **하나의 논리적 변경**만. 파일 이름 변경 · 삭제는 목적에 맞는 타입으로 분류한다.

#### 커밋 단위 (소기능마다 커밋)

기능 하나(PR 하나)를 끝까지 만든 뒤 한 번에 커밋하지 않고, **소기능이 하나 끝날 때마다 커밋**한다. 커밋이 잘게 남아 있어야 나중에 코드가 꼬이거나 문제가 생겼을 때 직전의 정상 상태로 쉽게 되돌리고, 어느 커밋에서 문제가 생겼는지 찾기 쉽다.

- **소기능** = 따로 떼어도 의미가 있는 작은 단위. 예: 표 하나의 Flyway SQL + 엔티티, Repository, service 메서드 하나(+ 테스트), API 하나, 화면 컴포넌트 하나, 문서 수정 하나.
- **커밋 전에 확인한다.** 백엔드는 최소 `./gradlew compileJava` (테스트가 있는 소기능은 `./gradlew test`), 프론트는 `npm run lint`. 빌드가 깨진 상태로는 커밋하지 않는다. 확인 못 한 검증이 있으면 커밋 후 보고에 그대로 적는다.
- 커밋에는 **그 소기능의 파일만** 넣는다. `git add .` · `git add -A` 대신 파일을 골라서 add 하고, `.env` 같은 비밀값 파일이 섞이지 않았는지 `git status` 로 확인한다.
- AI 도구는 소기능을 끝내면 사용자에게 다시 묻지 않고 커밋하고, 커밋 해시 · 메시지를 보고한다. 단, 사용자가 "커밋하지 마" 라고 하면 따른다.
- 커밋은 내 브랜치에만 쌓이고, 원격 반영(push)은 사용자가 요청할 때만 한다. 이미 push 한 커밋은 고치거나 지우지 않는다 (`commit --amend` · `reset` 후 force push 금지). 되돌릴 때는 `git revert`.

### 6-4. 완료의 정의

① 화면 또는 Swagger(`http://localhost:8080/swagger-ui/index.html`)로 동작 확인 ② 흐름 테스트 1개 이상 ③ PR 체크(`backend / test`, `frontend / check`) 통과 ④ `dev` 머지.

---

## 7. 도메인 · 담당

| 도메인 | 백엔드 | 프론트 | AI |
|---|---|---|---|
| 회원 · 인증, 매장, 연동, 날씨, 홈, 쿠폰, 매출 · 비용 | 예원 | 소정 | 후상 (운영 제안 · 쿠폰 문구 · 날씨 입력) |
| 메뉴 · 레시피, 에이전트 승인 · 실행 공통 | 예원 | 민성 | 후상 (레시피 · 신메뉴 · Tool Calling) |
| 품목 · 재고, 발주 · 입고 | 준표 | 민성 (+ 화면 공통 틀) | 후상 (수요 예측) |
| `common/` 설정 · 보안 · 외부 API, CI/CD, AWS(dev), 목업, 데모 데이터, POS 판매 저장(`SalesService.saveOrders`) | 경모 | — | — |

> 11/24 계약 회의: 메뉴 · 레시피와 승인 공통은 예원 담당으로 바뀌었습니다. 구현 계획서의 일정표는 아직 예전 담당으로 적혀 있을 수 있으니, 담당은 이 표를 따릅니다.

---

## 8. 자주 쓰는 명령

```bash
docker compose up -d                          # 서버(8080) + PostgreSQL + Redis + 목업(8089)
docker compose logs -f app                    # 서버 로그
cd backend && ./gradlew test                  # 백엔드 테스트 (Docker 필요)
cd frontend && npm ci && npm run dev          # 화면 (5173)
cd frontend && npm run lint && npm run build  # 프론트 검사
bash infra/demo-data/load.sh local            # 데모 데이터
docker compose down -v && docker compose up -d  # 로컬 DB 초기화
```

| 주소 | 용도 |
|---|---|
| http://localhost:5173 | 화면 (CORS 때문에 이 주소로) |
| http://localhost:8080/api/ping | 서버 · DB · Redis 연결 상태 |
| http://localhost:8080/swagger-ui/index.html | API 문서 |
| http://localhost:8089/__admin/requests | 목업이 받은 요청 기록 |
