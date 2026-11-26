# DB 규칙

PostgreSQL 17 · Flyway 규칙입니다. 표 · 칸 이름이 궁금하면 추측하지 말고 [전체 표 구조](../pjt_source/store-agent-db.sql)를 봅니다. 27개 표를 만드는 SQL이고, 마이그레이션 `V202611241000__create_store_agent_schema.sql` 과 내용이 같습니다. 설명은 [표 설계 설명](../pjt_source/store-agent-db-desc.md)에 있습니다.

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
- `suggestion.status` 에는 아직 "생성 중" · "생성 실패" 코드가 없다. `payload` · `evidence` 는 NOT NULL이다. 생성 상태 코드가 필요하면 새 마이그레이션으로 추가한다. 이때 `PENDING`(검토 대기)을 "생성 중"으로 같이 쓰지 않는다.
- `execution.approval_id` 는 필수다. 생성 작업을 넣으려고 가짜 승인을 만들지 않는다.
- `lease_owner` · `lease_expires_at` 칸은 지금 없다. 여러 워커 처리 · 장애 후 자동 인계를 만들 때만 따로 검토한다. 없는 칸을 있다고 가정하지 않는다.
- Java 코드에는 `EXPIRED` · `WAITING_AUTH` · `CHECKING` 이 아직 없다. 구현할 때 이 이름을 그대로 쓴다.

## AI 작업 저장소 (설계 예정)

- Python 작업 등록부와 LangGraph 체크포인트는 업무 표와 **스키마 · DB 계정을 나눠** 둔다. 초기에는 같은 PostgreSQL 인스턴스를 쓴다.
- Python 계정에는 업무 표 쓰기 권한을 주지 않는다. 업무 데이터는 Spring 내부 API로만 바꾼다.
- 체크포인트 표의 생성 · 업그레이드는 버전을 고정한 뒤 배포 절차로 관리한다. 애플리케이션이 실행 중에 업무 스키마에 표를 만들지 않는다.
- 작업 등록부 · 기기 등록 · 명령 기록 표는 아직 설계 전이다. 칸 이름을 추측해서 만들지 않는다.
