# DB 규칙

PostgreSQL 17 · Flyway 규칙입니다. 표 · 칸 이름이 궁금하면 추측하지 말고 [전체 표 구조](../pjt_source/store-agent-db.sql)를 봅니다. 28개 표의 현재 스키마입니다. 처음 27개 표는 `V202611241000__create_store_agent_schema.sql`, 그 뒤 변경은 이후 마이그레이션(`V202611261001` 사업자번호 UQ, `V202611262100` `ai_job`, `V202611271730` 제안 버전 UQ)에 있습니다. 설명은 [표 설계 설명](../pjt_source/store-agent-db-desc.md)에 있습니다.

- 업무 규칙(차감 계산 · 결제 상태 전이 등)은 [도메인 규칙](domain.md)에 씁니다.
- AI 작업 상태 저장 방식은 [AI 규칙](ai.md#상태-저장--재개)에 씁니다.

## 표 만들기 · 바꾸기 (Flyway)

- 표는 **SQL 마이그레이션으로만** 만든다 (`ddl-auto: validate`). 엔티티만 만들고 SQL을 빠뜨리지 않는다.
- 파일 이름: `backend/src/main/resources/db/migration/V<연월일시분>__<snake_case 설명>.sql` (예: `V202611241030__create_member_store.sql`)
- 🚨 **이미 머지된 마이그레이션 파일은 절대 고치지 않는다.** 바꿀 내용은 새 파일로 만든다.
- 공용 표(member · store · 판매 · 메뉴 · 품목)의 칸을 바꿀 때는 새 마이그레이션을 만들고, 사용자에게 "팀 공유 필요"라고 알린다.
- 표를 바꾸면 [`store-agent-db.sql`](../pjt_source/store-agent-db.sql)에도 같은 변경을 반영한다.
- 새 표를 만들면 `infra/demo-data/` 에 데모 데이터 SQL도 추가할지 사용자에게 묻는다.
- 상태 코드를 늘릴 때는 새 마이그레이션으로 `CHECK` 를 바꾼다.
- 스키마 파일이 있다는 것과 실행 중인 DB에 적용됐다는 것은 다르다. 둘을 구분해서 보고한다.

### 환경별 DB · Flyway

| 환경 | DB | Flyway |
|---|---|---|
| 내 PC | docker compose 의 postgres 컨테이너 (기본) 또는 `.env` 의 `DB_URL` | 켜짐 · 기본 검증 |
| dev 서버 | 팀 공용 온프레미스 PostgreSQL 17 (Secrets Manager `nansogong/dev` 의 `DB_URL`) | 켜짐 · `application-dev.yml` 에서 코드에 없는 적용 기록(`*:missing`)을 무시 |
| prod 서버 | RDS PostgreSQL 17 (prod 스택이 연결) | 켜짐 · 기본 검증 |

- 🚨 **새 마이그레이션은 머지 전까지 로컬 컨테이너 DB에서만 실행한다.** 공용 DB에 먼저 적용하면 그 파일이 없는 팀원 PC 서버는 Flyway 검증에 실패해서 뜨지 않는다 (dev 서버는 위 설정으로 무시한다).
- 공용 DB에 이미 적용된 마이그레이션 파일은 머지 전이라도 고치지 않는다. 체크섬이 달라져서 dev 서버까지 막힌다. 바꿀 내용은 새 파일로 만든다.

## 이름 · 타입

| 대상 | 규칙 |
|---|---|
| 표 · 칸 이름 | 표는 **단수** snake_case 소문자 (`menu`, `sales_order_item`). PK는 **`<표>_id`** (`menu.menu_id`). FK는 참조하는 PK와 같은 이름 (`sales_order_item.menu_id`). 역할이 있으면 `<역할>_<표>_id` (`parent_menu_id`, `default_supplier_id`) |
| ID | `BIGINT GENERATED ALWAYS AS IDENTITY` |
| 금액 | `DECIMAL(19,2)` / `BigDecimal` |
| 관리 단위당 단가 | `DECIMAL(19,4)` / `BigDecimal` (`item.unit_cost`, `item_cost.unit_cost`, `inventory_transaction.unit_cost`). 1g · 1ml 단가는 소수점 둘째 자리에서 끊으면 오차가 커서 따로 둔다 |
| 재고 · 레시피 수량 | `DECIMAL(19,3)` / `BigDecimal` (예: 18.5g) |
| 판매 수량 | `INTEGER` (잔 수는 정수) |
| 시간 | `TIMESTAMPTZ`. 매출 집계용 영업일은 한국 시간 기준 `business_date DATE` 칸을 따로 둔다 |
| 상태 값 | DB · API 모두 영어 대문자 코드 (`NEEDS_FIX`) + DB `CHECK`. 한글 표시는 프론트가 바꾼다 |
| JSONB 칸 | 안의 키는 camelCase (`posMenuCode`). 칸 수를 줄이는 대신 **안의 구조는 백엔드 DTO로 고정하고 저장 전에 검증**한다. 비밀값(토큰 · 세션 원문)은 넣지 않는다 |

## 매장 분리

> 마이그레이션 · 설계 SQL의 주석에 있는 "AGENTS.md 3-2"는 이 절을 가리킵니다. 머지된 마이그레이션은 고칠 수 없어서 주석은 그대로 둡니다.

- `member` 를 뺀 **모든 표에 `store_id`** 를 둔다. 하위 표(`sales_order_item`, `inventory_transaction`, `approval` …)에도 부모 행과 같은 값을 넣는다.
- 서비스 맨 앞에서 `StoreService.checkOwner(memberId, storeId)` 로 내 매장인지 확인한다. 남의 매장이면 403을 돌려준다.
- `memberId` · `storeId` 는 인증된 서버 컨텍스트에서 정한다. 요청 본문이나 LLM 출력으로 정하지 않는다.

## 칸 계약 (공용 표)

업무에서 이 칸들을 어떻게 쓰는지는 [도메인 규칙](domain.md)에 있습니다. 여기서는 칸과 값의 모양만 정합니다.

### 회원 · 매장

- `store.biz_reg_no`는 모든 계정에서 유일하다. 기존 복합 UQ도 유지한다. 기존 중복이 있으면 마이그레이션이 중단되며 자동 삭제·병합하지 않는다.
- 가입에서 서버가 진위 일치·계속사업자를 재확인한 매장만 `VERIFIED`와 `verified_at`을 저장한다.
- `member.phone_verified_at`은 서버 휴대전화 인증 증명의 확인 시각이다. 현재 개발용 인증 여부는 [가입 계약](backend.md#회원가입--로그인--매장-저장)을 따른다.
- `store.onboarding_status.storeBasics`는 매장 기본정보 저장 여부다. 다른 초기 설정 키는 보존한다.

### 품목 · 연동

- `item.unit` 값은 `G` · `ML` · `EA` 3개뿐이다.
- `item.pack_size` 는 구매 단위 1개가 관리 단위로 얼마인지를 담는다 (원두 1봉 = `1000` G).
- 단가는 항상 **관리 단위 1당 가격**이다 (원두 1g당 25원). 단가 이력은 `item_cost`, 현재 단가 캐시는 `item.unit_cost` 에 둔다.
- `integration` 칸
  - 계약 칸: `store_id`, `provider` (`TOSS_PLACE` · `OPEN_BANKING` · `SUPPLIER`), `status`, `external_store_id`, `auth_ref`, `last_synced_at`, `last_error`
  - 설계 칸: `external_user_ref`, `token_expires_at`, `data_scope`, `capabilities`, `connected_at`, `disconnected_at`, `sync_state`
- **인증값 원문(키 · 토큰 · 로그인 세션)은 DB에 넣지 않는다.** `auth_ref` 에는 저장 위치의 참조만 넣는다.
- 재로그인 · 재인증이 필요하면 `integration.status = EXPIRED` 로 표시한다.

### 판매 항목 `sales_order_item`

POS 원본 JSON은 `sales_order.raw_payload` (JSONB)에 **주문 단위로 통째로** 보관합니다.

| 칸 | 타입 · 제약 | 뜻 |
|---|---|---|
| `sales_order_id` | `BIGINT NOT NULL` FK | 주문 |
| `store_id` | `BIGINT NOT NULL` FK | 매장 (주문과 같은 값) |
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
| `refunded_amount` | `DECIMAL(19,2) NOT NULL DEFAULT 0` | 항목 누적 환불액 |
| `options` | `JSONB NOT NULL DEFAULT '[]'` | 옵션 배열 (아래) |
| `deduct_status` | `VARCHAR(20) NOT NULL DEFAULT 'PENDING'` | 재고 차감 상태 (`PENDING` · `DONE` · `NEEDS_FIX` · `SKIPPED`) |
| `processing_error` | `VARCHAR(255)` | `NEEDS_FIX` 사유 (메뉴 미연결 · 레시피 누락 등) |

`options` 모양:

```json
[{ "code": "OPT_SHOT", "name": "샷 추가", "qty": 1, "price": 500, "menuId": 31 }]
```

| 키 | 뜻 | 채우는 곳 |
|---|---|---|
| `code` · `name` | POS 옵션 코드 원문 · 판매 당시 옵션 이름 | 매출 도메인 (POS 저장) |
| `qty` | **메뉴 1개당** 옵션 수량 | 매출 도메인 |
| `price` | 옵션 1개 가격 | 매출 도메인 |
| `menuId` | `resolve` 로 찾은 옵션 메뉴 (`parent_menu_id` 가 있는 메뉴). 못 찾으면 `null` | 메뉴 도메인 (`resolve` 결과) |

중복 방지를 위해 `inventory_transaction` 의 UQ는 `(idempotency_key, item_id)` 입니다. 판매 1건이 재료 여러 행을 만들기 때문입니다.

### 발주 · 결제 · 제안 · 실행

| 표.칸 | 타입 · 값 | 담는 것 |
|---|---|---|
| `item.purchase_config` | JSONB | 기본 거래처 구매 설정: 기본 상품 코드 · URL, 옵션, 관리 단위당 최대 가격, 허용 가격 상승률, 비교 기준, 대체 허용 브랜드 · 용량 · 보관 방식 |
| `supplier.order_channel` | `API` · `BROWSER` · `MANUAL` (기본 `MANUAL`) | 거래처 주문 방식 |
| `purchase_order.order_method` | `BROWSER` 포함 | 주문 방식 |
| `purchase_order.payment_status` | `PENDING` · `PAID` · `FAILED` · `UNKNOWN` · `NOT_REQUIRED` (기본 `PENDING`) | 주문 상태(`status`)와 별개인 결제 상태 |
| `purchase_order.paid_amount` · `paid_at` | `DECIMAL(19,2)` · `TIMESTAMPTZ` | 결제 완료가 확인된 금액 · 시각 |
| `purchase_order_item.product_options` | JSONB | 주문할 때 선택한 상품 옵션 사본 (옵션 코드, 용량, 묶음 구성, 냉장 · 멸균) |
| `suggestion.generation_context` | JSONB | 승인 **전** 제안을 만드는 동안의 진행 · 복구 정보 (작업 참조와 생성 요약) |
| `execution.runtime_context` | JSONB | 승인 **후** 외부 실행의 진행 · 복구 정보 |
| `execution.exec_status` | `WAITING_AUTH` (인증 대기) · `CHECKING` (외부 결과 확인 중) 포함 | 실행 상태 |
| `execution.operation` | `PURCHASE_ORDER_SEND` · `COUPON_CREATE` · `COUPON_UPDATE` | 지금 지원하는 실행 종류 |

- 새 칸을 만들지 않고 기존 칸을 쓴다.

  | 담을 내용 | 쓸 칸 |
  |---|---|
  | 주 거래처 | `item.default_supplier_id` |
  | 최종 상품 · 수량 · 가격 · 배송 조건 | `suggestion.payload` |
  | 기본 거래처 확인 결과 · 대체 사유 · 후보 비교 | `suggestion.evidence` |
  | 승인 범위 | `approval.approved_scope` |
  | 실행 직전 조건 변경 | `execution.scope_check` |
  | 상품 코드 · URL · 포장 환산 | `purchase_order_item.product_ref` · `units_per_order` |
  | AI 추적 | `langsmith_trace_id` |

- **미결제면 `paid_amount` · `paid_at` 이 둘 다 NULL이어야 한다.** 지금 DB `CHECK` 는 둘 중 하나만 채운 경우를 막지 못한다. 그래서 서비스에서 검증하고, 새 마이그레이션으로 제약을 보완해야 한다.
- `suggestion.status` 에는 "생성 중" · "생성 실패" 코드가 없다. `payload` · `evidence` 는 NOT NULL이라 결과 전에는 행을 만들 수 없다. **생성 중 · 실패 상태는 `ai_job.status` 로 본다** ([AI 작업 기록](#ai-작업-기록-ai_job)). `PENDING`(검토 대기)을 "생성 중"으로 같이 쓰지 않는다.
- `execution.approval_id` 는 필수다. 생성 작업을 넣으려고 가짜 승인을 만들지 않는다.
- `suggestion` · `execution` 에는 `lease_owner` · `lease_expires_at` 칸이 없다. 여러 워커 처리 · 장애 후 자동 인계를 만들 때만 따로 검토한다. 없는 칸을 있다고 가정하지 않는다. AI 작업 단위의 처리 기한은 `ai_job.expires_at` 이 맡는다 ([AI 작업 기록](#ai-작업-기록-ai_job)).
- Java 코드에는 `EXPIRED` · `WAITING_AUTH` · `CHECKING` 이 아직 없다. 구현할 때 이 이름을 그대로 쓴다.

## AI 작업 기록 (`ai_job`)

AI 작업의 **기준 기록**은 Spring 업무 DB의 `ai_job` 표다. 칸은 [표 설계 설명](../pjt_source/store-agent-db-desc.md#ai_job)에 있다.

**시작 · 기준**

- Spring이 작업을 시작할 때 행을 먼저 만들고, `ai_job_id` 를 Python에 `jobId` 로 넘긴다.
- Python의 보고 · 내부 호출에서 매장 · 사용자는 **이 행으로 정한다.** 요청 본문 · 경로의 `storeId` 를 쓰지 않는다.
- 진행 중(`PENDING` · `RUNNING` · `WAITING_AUTH`)인 작업은 조건부 유일 인덱스로 겹치지 않게 막는다.
  - 발주 실행(`PURCHASE_EXECUTE`): **매장당 하나** ([아키텍처 배포 범위](architecture.md#배포-범위): 매장당 실행기 변경 명령 1개).
  - 나머지 제안 · 분석: **같은 매장 · `job_type` · `workflow_key` 마다 하나.** 다른 메뉴의 레시피 초안처럼 업무가 다르면 동시에 진행한다.
- `workflow_key` 는 같은 대상이면 같은 값이 되게 만든다 (예: 레시피 초안은 메뉴 기준). 작업 ID처럼 요청마다 달라지는 값을 넣지 않는다. 그래야 버튼을 두 번 눌러도 작업이 두 개 생기지 않는다. 정확한 형식은 작업 접수 API를 만들 때 정한다.
- 같은 업무가 이미 진행 중이면 새 작업을 만들지 않고 **진행 중인 작업을 그대로 돌려준다.** 화면은 그 작업의 진행 상황을 보여 준다. 동시에 들어온 요청은 유일 인덱스가 하나만 남기므로, 행 저장이 유일 인덱스에 막히면 진행 중인 행을 다시 조회해 돌려준다.
- 발주 실행만 예외로, **다른** 발주(`workflow_key` 가 다름)의 실행이 진행 중이면 409로 거절하고 앞 발주가 끝난 뒤 다시 요청하도록 안내한다. 다른 발주의 작업을 돌려주지 않는다.
- 화면은 이 표만 본다. Python 작업 등록부 · 체크포인트를 화면이 직접 보지 않는다.

**보고**

- 보고 순번은 `last_report_seq` 와 비교한다. 같으면 중복이라 무시하고(응답 유실 후 재시도), 작으면 순서가 뒤바뀐 것이라 거절하고, 크면 반영한다.
- 같은 순번 검사가 먼저다. 끝난 작업이라도 마지막 보고와 순번이 같으면 중복으로 보고 그대로 돌려준다 (`applied=false`).
- **끝난 작업(`SUCCEEDED` · `FAILED` · `CANCELED` · `SUPERSEDED`)에 온 새 순번 보고는 모두 거절한다.** 늦게 온 보고가 끝난 작업을 되살리지 않게 한다.
- 제안을 만드는 작업(레시피 초안 · 신메뉴 추천 · 발주 제안 · 쿠폰 제안)은 제안을 저장하기 전에 `SUCCEEDED` 로 끝낼 수 없다 (409). 화면에 "완료"인데 결과가 없는 상태를 막는다.
- 보고 반영과 만료 처리는 조건부로 갱신한다 (`WHERE status IN (진행 중) AND last_report_seq < :seq`). 스케줄러와 늦은 보고가 동시에 와도 한쪽만 반영된다.
- 작업에 이미 `suggestion_id` 가 있으면, 같은 작업의 제안 저장 요청은 새 버전을 만들지 않고 기존 제안을 돌려준다 (응답 유실 후 재시도로 제안이 두 번 생기는 것을 막는다).
- `suggestion_id` · `execution_id` 를 연결할 때 그 행의 `store_id` 가 `ai_job.store_id` 와 같은지 서비스에서 확인한다. DB FK는 매장까지 확인하지 않는다.
- 제안 버전은 **같은 매장 · `workflow_key` 마다** 1부터 센다 (`UNIQUE (store_id, workflow_key, version)`). 작업 종류가 달라도 같은 제안 유형이면 같은 키로 동시에 저장할 수 있으므로, 최신 버전을 읽기 전에 `(store_id, workflow_key)` 단위로 잠근다 (트랜잭션 advisory lock).

**기한 (`expires_at`)**

- Spring은 작업을 만들 때 `expires_at` 을 작업 종류별 제한 시간으로 채우고, 보고가 오면 연장한다.
- 보고로 `WAITING_AUTH` 가 되면 `expires_at` 을 인증 대기 기한으로 다시 정한다. 대기 중에는 보고가 오지 않기 때문이다.
- 기한이 지난 작업은 스케줄러가 정리한다. Python 장애로 `RUNNING` 에 멈춰 있지 않게 한다.
  - 제안 · 분석 작업: `FAILED`(`error_code` `TIMED_OUT`)로 끝낸다.
  - **발주 실행(`PURCHASE_EXECUTE`)은 시간 초과로 `FAILED` 처리하지 않는다.** 주문이 이미 나갔을 수 있으므로 연결된 `execution` 을 `CHECKING` 으로 두고 외부 주문 내역부터 확인한다 ([도메인 규칙 주문 · 결제 · 입고 결과](domain.md#주문--결제--입고-결과)). 이때 `ai_job.expires_at` 을 결과 확인 기한으로 다시 정한다. 그러지 않으면 만료 스케줄러가 같은 작업을 계속 다시 집는다. `ai_job` 은 확인 결과가 나온 뒤 닫는다.

## AI 작업 저장소 (`ai` 스키마)

Python 작업 등록부와 LangGraph 체크포인트는 업무 표와 **스키마 · DB 계정을 나눠** 둔다. 초기에는 같은 PostgreSQL 인스턴스를 쓴다.

| 표 | 담는 것 | 만드는 곳 |
|---|---|---|
| `ai.job` | 워커가 받아 가는 작업. PK는 Spring `ai_job_id`. 상태 · 선점 워커 · 기한 · 시도 횟수 · 취소 요청 | `ai/app/db/migrations/*.sql` |
| `ai.job_report` | Spring에 보낼 진행 · 결과 보고 편지함. 작업마다 `seq` 순번 | 같은 곳 |
| `ai.registry_migration` | 위 SQL 파일 적용 기록 | `ai/app/db/migrate.py` |
| `ai.checkpoints` 등 | LangGraph 체크포인트 (`thread_id` = `jobId`) | `PostgresSaver.setup()` (버전은 `ai/requirements.txt`) |

- 칸은 `ai/app/db/migrations/` 의 SQL 파일에 있다. 이미 적용된 파일은 고치지 않고, 바꿀 내용은 다음 번호 파일로 만든다.
- 계정 · `ai` 스키마(소유자 = Python 계정) · 권한은 인프라 DB 초기화 스크립트가 만든다. Flyway는 `ai` 스키마를 다루지 않는다.
- 표 생성 · 업그레이드는 배포 명령 `python -m app.db.migrate` 가 한다. 서버 · 워커는 실행 중에 표를 만들지 않는다.
- Python 계정에는 업무 표 쓰기 권한을 주지 않는다. 업무 데이터는 Spring 내부 API로만 바꾼다.
- 등록부 상태 이름은 Spring `ai_job` 과 같은 것만 쓴다 (`PENDING` · `RUNNING` · `SUCCEEDED` · `FAILED` · `CANCELED`). 기준 기록은 `ai_job` 이고, 화면 · Spring은 등록부를 직접 보지 않는다.
- 같은 `jobId` 는 한 번만 접수한다. 같은 내용으로 다시 오면 기존 작업을 돌려주고, 내용이 다르면 거절한다.
- 선점은 `FOR UPDATE SKIP LOCKED` 로 한다. 처리 · 보고 · 끝내기는 그 워커가 기한(`lease_expires_at`) 안에 잡고 있을 때만 반영한다. 기한이 지나면 다른 워커가 회수해서 체크포인트에서 이어 간다. 시도 한도를 넘으면 `RETRY_EXHAUSTED` 로 끝낸다.
- 보고는 편지함에 먼저 쓰고, 작업마다 `seq` 순서대로 보낸다. 전송에 실패하면 남겨 두었다가 다시 보낸다. 작업을 끝낼 때는 마지막 보고를 같은 트랜잭션에서 넣는다.
- 기기 등록 · 명령 기록 표는 아직 설계 전이다. 칸 이름을 추측해서 만들지 않는다.
