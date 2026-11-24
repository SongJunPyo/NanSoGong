-- 매장 에이전트 DB 설계 v1.1 · PostgreSQL 17 DDL
-- 원본 설계: docs/pjt_source/store-agent-db-desc.md (v1.1, MySQL 8 기준, 27개 표)
-- 원칙: 원본 설계를 그대로 따르고, AGENTS.md (2-2 명명 · 3-2 계층 규칙 · 3-5 데이터 계약) 와 부딪히는 곳만 바꿨습니다.
--
-- 📌 같은 내용이 두 곳에 있습니다 (두 파일은 항상 같아야 합니다)
--    - docs/pjt_source/store-agent-db.sql                                              설계 문서
--    - backend/src/main/resources/db/migration/V202611241000__create_store_agent_schema.sql  Flyway 마이그레이션
-- 🚨 마이그레이션은 머지 후 절대 고치지 않습니다. 표를 바꿀 때는 새 마이그레이션 파일을 추가하고, 이 설계 문서에도 같은 변경을 반영합니다.
--
-- 11/24 계약 적용 내용
--   - 표 이름 단수 snake_case (users → member, stores → store …). PK 는 <표>_id, FK 는 참조하는 PK 와 같은 이름 (역할이 있으면 <역할>_<표>_id)
--   - ID: BIGINT GENERATED ALWAYS AS IDENTITY
--   - 금액: DECIMAL(19,2) / 관리 단위당 단가(unit_cost): DECIMAL(19,4) / 재고·레시피 수량: DECIMAL(19,3) / 판매 수량: INTEGER
--   - 시간: TIMESTAMPTZ. 매출 영업일은 한국 시간 기준 business_date DATE
--   - 상태 값: 영어 대문자 코드 + CHECK. 한글 표시는 프론트가 담당 (각 칸 COMMENT 에 코드 ↔ 한글 대응)
--   - JSON 칸은 JSONB, 안의 키는 camelCase
--   - 품목 unit 은 G / ML / EA 만
--   - users → member: 단수 규칙을 따르면 user 인데 PostgreSQL 예약어라 매번 "user" 로 감싸야 함.
--     AGENTS.md 의 공용 표 이름 · 클래스 접두사(Member…) 와 맞춰 member 로 함
--   - 모든 업무 표에 store_id (AGENTS.md 3-2 매장 분리): 하위 표 12개에 store_id 추가 (부모 행과 같은 값)
--   - integration · sales_order_item: 계약 확정안 칸 + 계약과 부딪히지 않는 설계 칸은 유지. 바뀐 칸은 각 표 위 주석에 적음
--   - 각 표 위 주석에 도메인과 담당 (AGENTS.md 7장) 표시
--
-- MySQL → PostgreSQL 변환 메모
--   - 백틱·ENGINE·CHARSET 제거, 칸 설명은 COMMENT ON 으로
--   - updated_at: PostgreSQL 에는 ON UPDATE CURRENT_TIMESTAMP 가 없음 → JPA(@UpdateTimestamp 등)에서 갱신
--   - FK 칸에는 인덱스가 자동으로 생기지 않음 → 조회에 쓰는 FK 는 Flyway 에서 인덱스 추가 검토

-- ----------------------------------------------------------------------
-- member: 사장님 계정 (v1.1 users)
--   도메인: 계정·매장·연동 · 담당: 예원
-- ----------------------------------------------------------------------
CREATE TABLE member (
  member_id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  login_id           VARCHAR(50) NOT NULL,
  password_hash      VARCHAR(255) NOT NULL,
  name               VARCHAR(50) NOT NULL,
  phone              VARCHAR(20) NOT NULL,
  lock_settings      JSONB,
  status             VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'LOCKED', 'WITHDRAWN')),
  phone_verified_at  TIMESTAMPTZ NOT NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (login_id)
);

COMMENT ON TABLE member IS '사장님 계정 (v1.1 users)';
COMMENT ON COLUMN member.member_id IS '회원 ID';
COMMENT ON COLUMN member.login_id IS '로그인 아이디';
COMMENT ON COLUMN member.password_hash IS '암호화된 비밀번호 (단방향 해시)';
COMMENT ON COLUMN member.name IS '이름';
COMMENT ON COLUMN member.phone IS '인증한 휴대전화. 가입·비밀번호 찾기에 사용';
COMMENT ON COLUMN member.lock_settings IS '민감 정보 잠금 옵션: 사용 여부, 잠글 화면(매출·입출금 등), 해제 유지 시간';
COMMENT ON COLUMN member.status IS 'ACTIVE 활성 / LOCKED 잠김 / WITHDRAWN 탈퇴';
COMMENT ON COLUMN member.phone_verified_at IS '현재 전화번호의 인증 완료 시각';
COMMENT ON COLUMN member.created_at IS '생성 시각';
COMMENT ON COLUMN member.updated_at IS '수정 시각 (앱에서 갱신)';

-- ----------------------------------------------------------------------
-- store: 매장 (사업자등록 1건 = 매장 1개)
--   도메인: 계정·매장·연동 · 담당: 예원
-- ----------------------------------------------------------------------
CREATE TABLE store (
  store_id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  member_id           BIGINT NOT NULL REFERENCES member (member_id),
  biz_reg_no          CHAR(10) NOT NULL,
  biz_name            VARCHAR(100),
  owner_name          VARCHAR(50) NOT NULL CHECK (btrim(owner_name) <> ''),
  business_opened_on  DATE NOT NULL,
  verify_status       VARCHAR(20) NOT NULL DEFAULT 'UNVERIFIED' CHECK (verify_status IN ('UNVERIFIED', 'VERIFIED', 'CLOSED', 'FAILED')),
  verified_at         TIMESTAMPTZ,
  name                VARCHAR(100),
  category            VARCHAR(50),
  address             VARCHAR(255),
  open_hours          JSONB,
  closed_days         JSONB,
  coupon_settings     JSONB,
  onboarding_status   JSONB,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (member_id, biz_reg_no)
);

COMMENT ON TABLE store IS '매장 (사업자등록 1건 = 매장 1개)';
COMMENT ON COLUMN store.store_id IS '매장 ID';
COMMENT ON COLUMN store.member_id IS '소유 계정';
COMMENT ON COLUMN store.biz_reg_no IS '사업자등록번호 숫자 10자리 (member_id와 묶어서 UQ). 사업자등록 1건 = 매장 1개';
COMMENT ON COLUMN store.biz_name IS '상호 (사업자등록상). 매장명을 정하기 전 기본 표시명';
COMMENT ON COLUMN store.owner_name IS '대표자명 (공백만 입력 불가)';
COMMENT ON COLUMN store.business_opened_on IS '사업자등록상 개업일자';
COMMENT ON COLUMN store.verify_status IS 'UNVERIFIED 미확인 / VERIFIED 정상사업자 / CLOSED 휴·폐업 / FAILED 확인실패. 국세청 사업자 상태조회 결과 (진위확인은 3주차)';
COMMENT ON COLUMN store.verified_at IS '진위·상태 확인 시각';
COMMENT ON COLUMN store.name IS '매장명. 가입 때 상호가 있으면 미리 채우고 첫 매장 설정(UF-02)에서 확정';
COMMENT ON COLUMN store.category IS '업종 (카페, 분식 등). 첫 매장 설정(UF-02)에서 입력';
COMMENT ON COLUMN store.address IS '주소. 첫 매장 설정(UF-02)에서 입력. 날씨 좌표 계산에 사용';
COMMENT ON COLUMN store.open_hours IS '요일별 영업시간. 예: {"mon":["09:00","21:00"]}';
COMMENT ON COLUMN store.closed_days IS '정기 휴무 요일. 예: ["sun"]';
COMMENT ON COLUMN store.coupon_settings IS '쿠폰 운영 설정: 목표, 월 예산, 제외 메뉴, 제외 시간대, 재조정 한도 (UF-07 1단계). 키는 camelCase';
COMMENT ON COLUMN store.onboarding_status IS '초기 설정 단계별 완료 여부: 연동, 품목, 초기 재고, 레시피, 메뉴 연결. 로그인 후 다음 화면 안내에 사용. 키는 camelCase';
COMMENT ON COLUMN store.created_at IS '생성 시각';
COMMENT ON COLUMN store.updated_at IS '수정 시각 (앱에서 갱신)';

-- ----------------------------------------------------------------------
-- integration: POS·공급처·금융(오픈뱅킹) 연결. provider·status 코드는 11/24 계약
--   도메인: 계정·매장·연동 · 담당: 예원
--   v1.1 대비: provider_type·provider_name → provider (계약 코드), external_store_ref → external_store_id
-- ----------------------------------------------------------------------
CREATE TABLE integration (
  integration_id     BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  store_id           BIGINT NOT NULL REFERENCES store (store_id),
  provider           VARCHAR(20) NOT NULL CHECK (provider IN ('TOSS_PLACE', 'OPEN_BANKING', 'SUPPLIER')),
  status             VARCHAR(20) NOT NULL DEFAULT 'CONNECTED' CHECK (status IN ('CONNECTED', 'ERROR', 'EXPIRED', 'DISCONNECTED')),
  external_store_id  VARCHAR(100),
  external_user_ref  VARCHAR(100),
  auth_ref           VARCHAR(255) NOT NULL,
  token_expires_at   TIMESTAMPTZ,
  data_scope         JSONB,
  capabilities       JSONB,
  connected_at       TIMESTAMPTZ NOT NULL,
  disconnected_at    TIMESTAMPTZ,
  last_synced_at     TIMESTAMPTZ,
  last_error         TEXT,
  sync_state         JSONB NOT NULL DEFAULT '{}',
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (provider, external_store_id)
);

COMMENT ON TABLE integration IS 'POS·공급처·금융(오픈뱅킹) 연결. provider·status 코드는 11/24 계약';
COMMENT ON COLUMN integration.integration_id IS '연동 ID';
COMMENT ON COLUMN integration.store_id IS '매장';
COMMENT ON COLUMN integration.provider IS 'TOSS_PLACE 토스플레이스(POS) / OPEN_BANKING 오픈뱅킹(금융) / SUPPLIER 공급처';
COMMENT ON COLUMN integration.status IS 'CONNECTED 연결됨 / ERROR 오류 / EXPIRED 만료 / DISCONNECTED 해제';
COMMENT ON COLUMN integration.external_store_id IS '외부 서비스의 매장 식별자. 토스플레이스 merchantId (provider와 묶어서 UQ)';
COMMENT ON COLUMN integration.external_user_ref IS '외부 서비스의 사용자 식별자. 오픈뱅킹 사용자 일련번호';
COMMENT ON COLUMN integration.auth_ref IS '인증 정보 참조값. 원문(키·토큰)은 DB에 넣지 않고 .env·Secrets에만 보관';
COMMENT ON COLUMN integration.token_expires_at IS '접근 토큰 만료 시각. 만료 전 갱신·연동 만료 안내(41-2)에 사용';
COMMENT ON COLUMN integration.data_scope IS '제공 데이터 종류 코드 배열. 예: ["ORDER","PAYMENT","MENU","OPTION","COUPON_USE"]';
COMMENT ON COLUMN integration.capabilities IS '지원 기능. 예: {"couponSync":false,"orderSend":false,"correctionSend":false}. 화면 표시와 실행 가능 여부 판단에 사용';
COMMENT ON COLUMN integration.connected_at IS '연결 시각';
COMMENT ON COLUMN integration.disconnected_at IS '연결 해제 시각. 해제 후 데이터 보존 범위는 미정';
COMMENT ON COLUMN integration.last_synced_at IS '최근 동기화 성공 시각';
COMMENT ON COLUMN integration.last_error IS '최근 실패 사유';
COMMENT ON COLUMN integration.sync_state IS '데이터 종류별 현재 동기화 상태. 각 값은 cursor, completeThrough, requestedFrom/To, status, lastAttemptAt, errorCode/Message';
COMMENT ON COLUMN integration.created_at IS '생성 시각';
COMMENT ON COLUMN integration.updated_at IS '수정 시각 (앱에서 갱신)';

-- ----------------------------------------------------------------------
-- menu: 메뉴와 해당 메뉴의 옵션
--   도메인: 메뉴·레시피 · 담당: 예원
-- ----------------------------------------------------------------------
CREATE TABLE menu (
  menu_id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  store_id        BIGINT NOT NULL REFERENCES store (store_id),
  name            VARCHAR(100) NOT NULL,
  category        VARCHAR(50),
  price           DECIMAL(19,2) NOT NULL,
  spec            VARCHAR(50),
  sale_status     VARCHAR(20) NOT NULL DEFAULT 'ON_SALE' CHECK (sale_status IN ('ON_SALE', 'SOLD_OUT', 'INACTIVE')),
  source          VARCHAR(20) NOT NULL CHECK (source IN ('POS', 'MANUAL', 'AI_SUGGESTED')),
  menu_type       VARCHAR(10) NOT NULL DEFAULT 'MENU' CHECK (menu_type IN ('MENU', 'OPTION')),
  parent_menu_id  BIGINT REFERENCES menu (menu_id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE menu IS '메뉴와 해당 메뉴의 옵션';
COMMENT ON COLUMN menu.menu_id IS '메뉴 ID';
COMMENT ON COLUMN menu.store_id IS '매장';
COMMENT ON COLUMN menu.name IS '메뉴명';
COMMENT ON COLUMN menu.category IS '카테고리';
COMMENT ON COLUMN menu.price IS '판매가 (원)';
COMMENT ON COLUMN menu.spec IS '규격. 예: 톨, 1인분';
COMMENT ON COLUMN menu.sale_status IS 'ON_SALE 판매중 / SOLD_OUT 품절 / INACTIVE 비활성';
COMMENT ON COLUMN menu.source IS 'POS POS수집 / MANUAL 직접등록 / AI_SUGGESTED AI추천추가';
COMMENT ON COLUMN menu.menu_type IS 'MENU 기본 메뉴 / OPTION 옵션';
COMMENT ON COLUMN menu.parent_menu_id IS '옵션이면 소속 기본 메뉴. 기본 메뉴는 NULL';
COMMENT ON COLUMN menu.created_at IS '생성 시각';
COMMENT ON COLUMN menu.updated_at IS '수정 시각 (앱에서 갱신)';

-- ----------------------------------------------------------------------
-- supplier: 공급처
--   도메인: 거래처·발주·입고 · 담당: 준표
-- ----------------------------------------------------------------------
CREATE TABLE supplier (
  supplier_id     BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  store_id        BIGINT NOT NULL REFERENCES store (store_id),
  name            VARCHAR(100) NOT NULL,
  source          VARCHAR(20) NOT NULL CHECK (source IN ('REGISTERED', 'DISCOVERED')),
  integration_id  BIGINT REFERENCES integration (integration_id),
  contact         VARCHAR(255),
  lead_time_days  INTEGER,
  verify_status   VARCHAR(20) NOT NULL DEFAULT 'UNVERIFIED' CHECK (verify_status IN ('UNVERIFIED', 'VERIFIED', 'EXCLUDED')),
  verified_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE supplier IS '공급처';
COMMENT ON COLUMN supplier.supplier_id IS '공급처 ID';
COMMENT ON COLUMN supplier.store_id IS '매장';
COMMENT ON COLUMN supplier.name IS '공급처명';
COMMENT ON COLUMN supplier.source IS 'REGISTERED 등록 / DISCOVERED 신규탐색';
COMMENT ON COLUMN supplier.integration_id IS '연동 발주가 가능하면 값, NULL이면 직접 주문';
COMMENT ON COLUMN supplier.contact IS '연락처·사이트 URL';
COMMENT ON COLUMN supplier.lead_time_days IS '주문부터 도착까지 기본 일수. 사장님 입력 또는 과거 발주의 주문~첫 정상 입고 간격으로 추정';
COMMENT ON COLUMN supplier.verify_status IS 'UNVERIFIED 미검증 / VERIFIED 검증완료 / EXCLUDED 제외';
COMMENT ON COLUMN supplier.verified_at IS '검증 시각';
COMMENT ON COLUMN supplier.created_at IS '생성 시각';
COMMENT ON COLUMN supplier.updated_at IS '수정 시각 (앱에서 갱신)';

-- ----------------------------------------------------------------------
-- item: 재고 품목 (원재료·포장재)
--   도메인: 재고·원가 · 담당: 준표
-- ----------------------------------------------------------------------
CREATE TABLE item (
  item_id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  store_id             BIGINT NOT NULL REFERENCES store (store_id),
  name                 VARCHAR(100) NOT NULL,
  item_type            VARCHAR(20) NOT NULL CHECK (item_type IN ('INGREDIENT', 'PACKAGING')),
  category             VARCHAR(50),
  unit                 VARCHAR(10) NOT NULL CHECK (unit IN ('G', 'ML', 'EA')),
  purchase_unit        VARCHAR(10),
  pack_size            DECIMAL(19,3) CHECK (pack_size > 0),
  unit_cost            DECIMAL(19,4),
  default_supplier_id  BIGINT REFERENCES supplier (supplier_id),
  is_active            BOOLEAN NOT NULL DEFAULT TRUE,
  reorder_point        DECIMAL(19,3),
  target_qty           DECIMAL(19,3),
  policy_basis         JSONB,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE item IS '재고 품목 (원재료·포장재)';
COMMENT ON COLUMN item.item_id IS '품목 ID';
COMMENT ON COLUMN item.store_id IS '매장';
COMMENT ON COLUMN item.name IS '품목명';
COMMENT ON COLUMN item.item_type IS 'INGREDIENT 원재료 / PACKAGING 포장재';
COMMENT ON COLUMN item.category IS '분류';
COMMENT ON COLUMN item.unit IS '관리 단위 G / ML / EA. 재고·레시피 수량의 기준';
COMMENT ON COLUMN item.purchase_unit IS '구매 단위 표시명 (팩/박스)';
COMMENT ON COLUMN item.pack_size IS '구매 단위 1개 = 관리 단위 몇 개. 예: 원두 1봉 = 1000 (G)';
COMMENT ON COLUMN item.unit_cost IS '현재 관리 단위 1당 원가 캐시 (item_cost 최신값 사본). 예: 원두 1g당 25원';
COMMENT ON COLUMN item.default_supplier_id IS '기본 공급처';
COMMENT ON COLUMN item.is_active IS '사용 여부';
COMMENT ON COLUMN item.reorder_point IS '현재 발주 검토 기준 수량. NULL이면 미산정';
COMMENT ON COLUMN item.target_qty IS '현재 목표 확보 수량';
COMMENT ON COLUMN item.policy_basis IS '현재 기준의 근거 요약·산정 시각·사용자가 확인한 값. 실행 로그 아님. 키는 camelCase';
COMMENT ON COLUMN item.created_at IS '생성 시각';
COMMENT ON COLUMN item.updated_at IS '수정 시각 (앱에서 갱신)';

-- ----------------------------------------------------------------------
-- recipe_item: 메뉴·옵션별 레시피와 적용 기간
--   도메인: 메뉴·레시피 · 담당: 예원
-- ----------------------------------------------------------------------
CREATE TABLE recipe_item (
  recipe_item_id  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  store_id        BIGINT NOT NULL REFERENCES store (store_id),
  menu_id         BIGINT NOT NULL REFERENCES menu (menu_id),
  item_id         BIGINT NOT NULL REFERENCES item (item_id),
  quantity        DECIMAL(19,3) NOT NULL,
  applies_to      VARCHAR(20) NOT NULL DEFAULT 'ALL' CHECK (applies_to IN ('ALL', 'DINE_IN', 'TAKEOUT_DELIVERY')),
  source          VARCHAR(20) NOT NULL CHECK (source IN ('AI_DRAFT', 'OWNER')),
  valid_from      TIMESTAMPTZ NOT NULL,
  valid_to        TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (menu_id, item_id, valid_from),
  CHECK (valid_to IS NULL OR valid_to > valid_from)
);

COMMENT ON TABLE recipe_item IS '메뉴·옵션별 레시피와 적용 기간';
COMMENT ON COLUMN recipe_item.recipe_item_id IS '레시피 항목 ID';
COMMENT ON COLUMN recipe_item.store_id IS '매장. 부모 행과 같은 값 (매장 분리 확인용, AGENTS.md 3-2)';
COMMENT ON COLUMN recipe_item.menu_id IS '기본 메뉴 또는 옵션 행. 옵션이면 해당 옵션 선택 시에만 적용';
COMMENT ON COLUMN recipe_item.item_id IS '사용 재료·포장재';
COMMENT ON COLUMN recipe_item.quantity IS '메뉴 1개당 사용량 (관리 단위). 기본 메뉴는 양수, 옵션은 기본 대비 증감량';
COMMENT ON COLUMN recipe_item.applies_to IS 'ALL 전체 / DINE_IN 매장 / TAKEOUT_DELIVERY 포장·배달. 컵·뚜껑처럼 주문 유형에 따라 쓰는 재료';
COMMENT ON COLUMN recipe_item.source IS 'AI_DRAFT AI초안 / OWNER 사장님. AI 초안을 고치지 않고 저장했는지 구분';
COMMENT ON COLUMN recipe_item.valid_from IS '적용 시작 시각';
COMMENT ON COLUMN recipe_item.valid_to IS '적용 종료 시각 (미포함). NULL이면 종료 미정';
COMMENT ON COLUMN recipe_item.created_at IS '생성 시각';
COMMENT ON COLUMN recipe_item.updated_at IS '수정 시각 (앱에서 갱신)';

-- ----------------------------------------------------------------------
-- pos_menu_mapping: POS 메뉴·옵션 ↔ 앱 메뉴·옵션 연결
--   도메인: 메뉴·레시피 · 담당: 예원
-- ----------------------------------------------------------------------
CREATE TABLE pos_menu_mapping (
  pos_menu_mapping_id  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  store_id             BIGINT NOT NULL REFERENCES store (store_id),
  integration_id       BIGINT NOT NULL REFERENCES integration (integration_id),
  pos_menu_code        VARCHAR(100) NOT NULL,
  pos_option_code      VARCHAR(100) NOT NULL DEFAULT '',
  pos_name             VARCHAR(100) NOT NULL,
  menu_id              BIGINT REFERENCES menu (menu_id),
  status               VARCHAR(20) NOT NULL DEFAULT 'UNMAPPED' CHECK (status IN ('MAPPED', 'UNMAPPED', 'EXCLUDED')),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (integration_id, pos_menu_code, pos_option_code)
);

COMMENT ON TABLE pos_menu_mapping IS 'POS 메뉴·옵션 ↔ 앱 메뉴·옵션 연결';
COMMENT ON COLUMN pos_menu_mapping.pos_menu_mapping_id IS '매핑 ID';
COMMENT ON COLUMN pos_menu_mapping.store_id IS '매장. 부모 행과 같은 값 (매장 분리 확인용, AGENTS.md 3-2)';
COMMENT ON COLUMN pos_menu_mapping.integration_id IS 'POS 연동';
COMMENT ON COLUMN pos_menu_mapping.pos_menu_code IS 'POS 메뉴 코드';
COMMENT ON COLUMN pos_menu_mapping.pos_option_code IS '기본 메뉴 연결이면 빈 문자열, 옵션 연결이면 POS 옵션 코드';
COMMENT ON COLUMN pos_menu_mapping.pos_name IS 'POS 표시명';
COMMENT ON COLUMN pos_menu_mapping.menu_id IS '기본 메뉴 또는 옵션 행. 미연결이면 NULL';
COMMENT ON COLUMN pos_menu_mapping.status IS 'MAPPED 연결 / UNMAPPED 미연결 / EXCLUDED 제외. 제외 옵션(예: 얼음 적게)은 사용량 0으로 정상 처리';
COMMENT ON COLUMN pos_menu_mapping.created_at IS '생성 시각';
COMMENT ON COLUMN pos_menu_mapping.updated_at IS '수정 시각 (앱에서 갱신)';

-- ----------------------------------------------------------------------
-- item_cost: 품목 단가 이력 (적용 시점 관리)
--   도메인: 재고·원가 · 담당: 예원 (단가 이력, 계약) · 추가만 하고 수정하지 않는 표
-- ----------------------------------------------------------------------
CREATE TABLE item_cost (
  item_cost_id    BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  store_id        BIGINT NOT NULL REFERENCES store (store_id),
  item_id         BIGINT NOT NULL REFERENCES item (item_id),
  unit_cost       DECIMAL(19,4) NOT NULL,
  effective_from  TIMESTAMPTZ NOT NULL,
  source          VARCHAR(20) NOT NULL CHECK (source IN ('SUPPLIER_PRICE', 'RECEIPT_PRICE', 'MANUAL')),
  ref_id          BIGINT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (item_id, effective_from)
);

COMMENT ON TABLE item_cost IS '품목 단가 이력 (적용 시점 관리)';
COMMENT ON COLUMN item_cost.item_cost_id IS '단가 이력 ID';
COMMENT ON COLUMN item_cost.store_id IS '매장. 부모 행과 같은 값 (매장 분리 확인용, AGENTS.md 3-2)';
COMMENT ON COLUMN item_cost.item_id IS '품목';
COMMENT ON COLUMN item_cost.unit_cost IS '관리 단위 1당 원가';
COMMENT ON COLUMN item_cost.effective_from IS '적용 시작 시각';
COMMENT ON COLUMN item_cost.source IS 'SUPPLIER_PRICE 공급처단가 / RECEIPT_PRICE 입고단가 / MANUAL 직접입력';
COMMENT ON COLUMN item_cost.ref_id IS '근거 레코드 ID (입고단가면 receipt_item.receipt_item_id)';
COMMENT ON COLUMN item_cost.created_at IS '생성 시각';

-- ----------------------------------------------------------------------
-- sales_order: POS 주문
--   도메인: 판매·매출 · 담당: 경모 (POS 저장) · 예원 (매출 집계)
--   v1.1 대비: pos_order_no(→ external_order_id), sales_date(→ business_date). raw_payload 추가
-- ----------------------------------------------------------------------
CREATE TABLE sales_order (
  sales_order_id     BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  store_id           BIGINT NOT NULL REFERENCES store (store_id),
  integration_id     BIGINT NOT NULL REFERENCES integration (integration_id),
  external_order_id  VARCHAR(100) NOT NULL,
  ordered_at         TIMESTAMPTZ NOT NULL,
  business_date      DATE NOT NULL,
  order_type         VARCHAR(10) NOT NULL DEFAULT 'UNKNOWN' CHECK (order_type IN ('DINE_IN', 'TAKEOUT', 'DELIVERY', 'UNKNOWN')),
  total_amount       DECIMAL(19,2) NOT NULL,
  discount_amount    DECIMAL(19,2) NOT NULL DEFAULT 0,
  status             VARCHAR(20) NOT NULL CHECK (status IN ('COMPLETED', 'CANCELED', 'PARTIALLY_REFUNDED', 'REFUNDED')),
  canceled_at        TIMESTAMPTZ,
  received_at        TIMESTAMPTZ NOT NULL,
  refunded_amount    DECIMAL(19,2) NOT NULL DEFAULT 0,
  source_updated_at  TIMESTAMPTZ,
  raw_payload        JSONB NOT NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (integration_id, external_order_id),
  CHECK (refunded_amount <= total_amount)
);

COMMENT ON TABLE sales_order IS 'POS 주문';
COMMENT ON COLUMN sales_order.sales_order_id IS '주문 ID';
COMMENT ON COLUMN sales_order.store_id IS '매장';
COMMENT ON COLUMN sales_order.integration_id IS '수집한 POS';
COMMENT ON COLUMN sales_order.external_order_id IS 'POS 주문번호 (integration_id와 묶어서 UQ). 같은 값이 다시 오면 saveOrders가 무시';
COMMENT ON COLUMN sales_order.ordered_at IS '주문 시각';
COMMENT ON COLUMN sales_order.business_date IS '영업일 (한국 시간 기준). 매출 집계의 날짜 기준';
COMMENT ON COLUMN sales_order.order_type IS 'DINE_IN 매장 / TAKEOUT 포장 / DELIVERY 배달 / UNKNOWN 미확인. POS가 주지 않으면 UNKNOWN';
COMMENT ON COLUMN sales_order.total_amount IS '최초 결제액 (할인 반영 후, 환불 전). 원본 결제 사본';
COMMENT ON COLUMN sales_order.discount_amount IS '할인 금액 (쿠폰 할인 포함)';
COMMENT ON COLUMN sales_order.status IS 'COMPLETED 완료 / CANCELED 취소 / PARTIALLY_REFUNDED 부분환불 / REFUNDED 환불';
COMMENT ON COLUMN sales_order.canceled_at IS '취소·환불 시각';
COMMENT ON COLUMN sales_order.received_at IS '수집 시각. 늦게 들어온 주문 구분';
COMMENT ON COLUMN sales_order.refunded_amount IS '누적 취소·환불액. total_amount 이하';
COMMENT ON COLUMN sales_order.source_updated_at IS '공급자 수정 시각·버전 판단용. 오래된 스냅샷으로 되돌리지 않음';
COMMENT ON COLUMN sales_order.raw_payload IS 'POS 원본 JSON. 주문 단위로 통째로 보관';
COMMENT ON COLUMN sales_order.created_at IS '생성 시각';
COMMENT ON COLUMN sales_order.updated_at IS '수정 시각 (앱에서 갱신)';

-- ----------------------------------------------------------------------
-- sales_order_item: 주문 항목. 모양은 11/24 계약 확정안
--   도메인: 판매·매출 · 담당: 경모 (POS 저장) · 준표 (재고 차감 상태)
--   v1.1 대비: pos_line_id → line_no, refunded_qty → canceled_quantity, inventory_status → deduct_status, restock_policy 삭제 (계약: 취소는 항상 환원 장부 추가). menu_name·option_price·discount_amount 추가 (계약)
-- ----------------------------------------------------------------------
CREATE TABLE sales_order_item (
  sales_order_item_id  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  store_id             BIGINT NOT NULL REFERENCES store (store_id),
  sales_order_id       BIGINT NOT NULL REFERENCES sales_order (sales_order_id),
  line_no              INTEGER NOT NULL,
  pos_menu_code        VARCHAR(100) NOT NULL,
  menu_id              BIGINT REFERENCES menu (menu_id),
  menu_name            VARCHAR(100) NOT NULL,
  quantity             INTEGER NOT NULL CHECK (quantity > 0),
  canceled_quantity    INTEGER NOT NULL DEFAULT 0,
  unit_price           DECIMAL(19,2) NOT NULL,
  option_price         DECIMAL(19,2) NOT NULL DEFAULT 0,
  discount_amount      DECIMAL(19,2) NOT NULL DEFAULT 0,
  amount               DECIMAL(19,2) NOT NULL,
  options              JSONB NOT NULL DEFAULT '[]',
  refunded_amount      DECIMAL(19,2) NOT NULL DEFAULT 0,
  deduct_status        VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (deduct_status IN ('PENDING', 'DONE', 'NEEDS_FIX', 'SKIPPED')),
  processing_error     VARCHAR(255),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (sales_order_id, line_no),
  CHECK (canceled_quantity BETWEEN 0 AND quantity)
);

COMMENT ON TABLE sales_order_item IS '주문 항목. 모양은 11/24 계약 확정안';
COMMENT ON COLUMN sales_order_item.sales_order_item_id IS '주문 항목 ID';
COMMENT ON COLUMN sales_order_item.store_id IS '매장. 부모 행과 같은 값 (매장 분리 확인용, AGENTS.md 3-2)';
COMMENT ON COLUMN sales_order_item.sales_order_id IS '주문';
COMMENT ON COLUMN sales_order_item.line_no IS 'POS 주문 안의 줄 번호';
COMMENT ON COLUMN sales_order_item.pos_menu_code IS 'POS 코드 원문';
COMMENT ON COLUMN sales_order_item.menu_id IS 'resolve 결과. 못 찾으면 NULL';
COMMENT ON COLUMN sales_order_item.menu_name IS '판매 당시 이름';
COMMENT ON COLUMN sales_order_item.quantity IS '판매 수량';
COMMENT ON COLUMN sales_order_item.canceled_quantity IS '누적 취소 수량. 차감 수량 = quantity − canceled_quantity';
COMMENT ON COLUMN sales_order_item.unit_price IS '메뉴 1개 가격 (옵션 제외)';
COMMENT ON COLUMN sales_order_item.option_price IS '메뉴 1개당 옵션 가격 합';
COMMENT ON COLUMN sales_order_item.discount_amount IS '할인 금액';
COMMENT ON COLUMN sales_order_item.amount IS '실제 결제된 줄 금액 = (unit_price + option_price) × quantity − discount_amount';
COMMENT ON COLUMN sales_order_item.options IS '옵션 배열 [{code, name, qty, price, menuId}]. qty는 메뉴 1개당 수량, menuId는 resolve로 찾은 옵션 메뉴(못 찾으면 null)';
COMMENT ON COLUMN sales_order_item.refunded_amount IS '항목 누적 환불액';
COMMENT ON COLUMN sales_order_item.deduct_status IS 'PENDING 차감 전 / DONE 차감 완료 / NEEDS_FIX 메뉴·옵션 미매핑 또는 레시피 누락 / SKIPPED 재고를 쓰지 않는 메뉴';
COMMENT ON COLUMN sales_order_item.processing_error IS 'NEEDS_FIX 사유 (메뉴 미연결·옵션 단위·레시피 누락 등). 단가 누락은 원가만 계산불가로 두고 차감은 진행';
COMMENT ON COLUMN sales_order_item.created_at IS '생성 시각';
COMMENT ON COLUMN sales_order_item.updated_at IS '수정 시각 (앱에서 갱신)';

-- ----------------------------------------------------------------------
-- suggestion: 발주·쿠폰·메뉴·재고 제안의 버전별 결과
--   도메인: 제안·승인·실행 · 담당: 예원 (승인 공통)
-- ----------------------------------------------------------------------
CREATE TABLE suggestion (
  suggestion_id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  store_id              BIGINT NOT NULL REFERENCES store (store_id),
  workflow_key          VARCHAR(64) NOT NULL,
  version               INTEGER NOT NULL CHECK (version >= 1),
  parent_suggestion_id  BIGINT REFERENCES suggestion (suggestion_id),
  change_source         VARCHAR(20) NOT NULL CHECK (change_source IN ('AI_GENERATED', 'OWNER_EDITED', 'REGENERATE_REQUESTED', 'REANALYZED')),
  change_reason         VARCHAR(500),
  suggestion_type       VARCHAR(20) NOT NULL CHECK (suggestion_type IN ('PURCHASE', 'COUPON', 'MENU', 'STOCK_ALERT', 'DATA_FIX')),
  urgency_level         VARCHAR(10) NOT NULL DEFAULT 'NORMAL' CHECK (urgency_level IN ('URGENT', 'WARNING', 'NORMAL')),
  priority              INTEGER NOT NULL,
  title                 VARCHAR(200) NOT NULL,
  summary               VARCHAR(500),
  payload               JSONB NOT NULL,
  evidence              JSONB NOT NULL,
  status                VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ON_HOLD', 'REJECTED', 'APPROVED', 'ACKNOWLEDGED', 'NEEDS_FIX', 'EXPIRED', 'SUPERSEDED')),
  business_date         DATE NOT NULL,
  langsmith_trace_id    VARCHAR(64),
  added_menu_id         BIGINT REFERENCES menu (menu_id),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (workflow_key, version),
  UNIQUE (added_menu_id)
);

COMMENT ON TABLE suggestion IS '발주·쿠폰·메뉴·재고 제안의 버전별 결과';
COMMENT ON COLUMN suggestion.suggestion_id IS '제안 버전 ID';
COMMENT ON COLUMN suggestion.store_id IS '매장';
COMMENT ON COLUMN suggestion.workflow_key IS '동일 업무의 안정적인 키 (version과 묶어서 UQ)';
COMMENT ON COLUMN suggestion.version IS '1부터 증가하는 버전';
COMMENT ON COLUMN suggestion.parent_suggestion_id IS '수정 전 버전. 처음이면 NULL';
COMMENT ON COLUMN suggestion.change_source IS 'AI_GENERATED AI생성 / OWNER_EDITED 사장님수정 / REGENERATE_REQUESTED 재생성요청 / REANALYZED 재분석. 이 버전을 만든 주체';
COMMENT ON COLUMN suggestion.change_reason IS '사장님 수정 이유. 예: 레시피 사용량·재고·공급처 사유';
COMMENT ON COLUMN suggestion.suggestion_type IS 'PURCHASE 발주 / COUPON 쿠폰 / MENU 메뉴 / STOCK_ALERT 재고알림 / DATA_FIX 데이터보완';
COMMENT ON COLUMN suggestion.urgency_level IS 'URGENT 긴급 / WARNING 주의 / NORMAL 일반';
COMMENT ON COLUMN suggestion.priority IS '같은 긴급도 안의 표시 순서';
COMMENT ON COLUMN suggestion.title IS '제안 제목';
COMMENT ON COLUMN suggestion.summary IS '사용자 안내·보류 사유 요약';
COMMENT ON COLUMN suggestion.payload IS '유형별 최종 제안 내용. 키는 camelCase';
COMMENT ON COLUMN suggestion.evidence IS '사용자에게 보여줄 근거·출처·기준 시각·예상 효과 사본. 키는 camelCase';
COMMENT ON COLUMN suggestion.status IS 'PENDING 검토대기 / ON_HOLD 보류 / REJECTED 반려 / APPROVED 승인 / ACKNOWLEDGED 확인완료 / NEEDS_FIX 보완필요 / EXPIRED 만료 / SUPERSEDED 대체됨';
COMMENT ON COLUMN suggestion.business_date IS '한국 기준 제안 기준일';
COMMENT ON COLUMN suggestion.langsmith_trace_id IS 'AI 추적 연결값. 서비스 원본이나 FK가 아님';
COMMENT ON COLUMN suggestion.added_menu_id IS '메뉴 제안으로 추가한 기본 메뉴. 다른 유형은 NULL';
COMMENT ON COLUMN suggestion.created_at IS '생성 시각';
COMMENT ON COLUMN suggestion.updated_at IS '수정 시각 (앱에서 갱신)';

-- ----------------------------------------------------------------------
-- approval: 사용자의 승인·보류·반려 결정
--   도메인: 제안·승인·실행 · 담당: 예원 (승인 공통) · 추가만 하고 수정하지 않는 표
-- ----------------------------------------------------------------------
CREATE TABLE approval (
  approval_id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  store_id              BIGINT NOT NULL REFERENCES store (store_id),
  suggestion_id         BIGINT NOT NULL REFERENCES suggestion (suggestion_id),
  decided_by_member_id  BIGINT NOT NULL REFERENCES member (member_id),
  decision              VARCHAR(10) NOT NULL CHECK (decision IN ('APPROVED', 'ON_HOLD', 'REJECTED')),
  reason                VARCHAR(500),
  approved_scope        JSONB,
  decided_at            TIMESTAMPTZ NOT NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE approval IS '사용자의 승인·보류·반려 결정';
COMMENT ON COLUMN approval.approval_id IS '결정 ID';
COMMENT ON COLUMN approval.store_id IS '매장. 부모 행과 같은 값 (매장 분리 확인용, AGENTS.md 3-2)';
COMMENT ON COLUMN approval.suggestion_id IS '결정한 제안 버전';
COMMENT ON COLUMN approval.decided_by_member_id IS '실제로 결정한 사용자 (v1.1 decided_by)';
COMMENT ON COLUMN approval.decision IS 'APPROVED 승인 / ON_HOLD 보류 / REJECTED 반려';
COMMENT ON COLUMN approval.reason IS '결정 사유';
COMMENT ON COLUMN approval.approved_scope IS '승인한 대상·품목·공급처·최대 금액·기간·쿠폰 할인/한도 사본. 키는 camelCase';
COMMENT ON COLUMN approval.decided_at IS '결정 시각';
COMMENT ON COLUMN approval.created_at IS '생성 시각';

-- ----------------------------------------------------------------------
-- purchase_order: 발주 (연동 전송·직접 주문)
--   도메인: 거래처·발주·입고 · 담당: 준표
-- ----------------------------------------------------------------------
CREATE TABLE purchase_order (
  purchase_order_id   BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  store_id            BIGINT NOT NULL REFERENCES store (store_id),
  supplier_id         BIGINT NOT NULL REFERENCES supplier (supplier_id),
  order_method        VARCHAR(20) NOT NULL CHECK (order_method IN ('API', 'MANUAL')),
  status              VARCHAR(20) NOT NULL CHECK (status IN ('READY_TO_SEND', 'REQUESTED', 'ACCEPTED', 'SHIPPING', 'PARTIALLY_RECEIVED', 'NEEDS_CHECK', 'RECEIVED', 'CLOSED', 'CANCELED')),
  subtotal            DECIMAL(19,2) NOT NULL,
  shipping_fee        DECIMAL(19,2),
  total_amount        DECIMAL(19,2) NOT NULL,
  ordered_at          TIMESTAMPTZ,
  expected_arrival    DATE,
  external_order_ref  VARCHAR(100),
  approval_id         BIGINT REFERENCES approval (approval_id),
  workflow_key        VARCHAR(64) NOT NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (workflow_key)
);

COMMENT ON TABLE purchase_order IS '발주 (연동 전송·직접 주문)';
COMMENT ON COLUMN purchase_order.purchase_order_id IS '발주 ID';
COMMENT ON COLUMN purchase_order.store_id IS '매장';
COMMENT ON COLUMN purchase_order.supplier_id IS '공급처';
COMMENT ON COLUMN purchase_order.order_method IS 'API API전송 / MANUAL 직접주문';
COMMENT ON COLUMN purchase_order.status IS 'READY_TO_SEND 전송대기 / REQUESTED 요청 / ACCEPTED 접수 / SHIPPING 배송중 / PARTIALLY_RECEIVED 부분입고 / NEEDS_CHECK 확인필요 / RECEIVED 입고완료 / CLOSED 종료(일부 품목을 거절·잔량종료로 마친 주문) / CANCELED 취소';
COMMENT ON COLUMN purchase_order.subtotal IS '상품 금액';
COMMENT ON COLUMN purchase_order.shipping_fee IS '배송비';
COMMENT ON COLUMN purchase_order.total_amount IS '총액';
COMMENT ON COLUMN purchase_order.ordered_at IS '외부 요청 또는 직접 주문 시각. READY_TO_SEND이면 NULL';
COMMENT ON COLUMN purchase_order.expected_arrival IS '도착 예정일';
COMMENT ON COLUMN purchase_order.external_order_ref IS '공급처 주문번호';
COMMENT ON COLUMN purchase_order.approval_id IS '발주에 사용한 승인. 승인 없이 이미 주문한 내용을 등록한 경우만 NULL';
COMMENT ON COLUMN purchase_order.workflow_key IS '한 발주 업무의 식별자. 재승인·재시도에도 유지';
COMMENT ON COLUMN purchase_order.created_at IS '생성 시각';
COMMENT ON COLUMN purchase_order.updated_at IS '수정 시각 (앱에서 갱신)';

-- ----------------------------------------------------------------------
-- purchase_order_item: 발주 품목
--   도메인: 거래처·발주·입고 · 담당: 준표
-- ----------------------------------------------------------------------
CREATE TABLE purchase_order_item (
  purchase_order_item_id  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  store_id                BIGINT NOT NULL REFERENCES store (store_id),
  purchase_order_id       BIGINT NOT NULL REFERENCES purchase_order (purchase_order_id),
  item_id                 BIGINT NOT NULL REFERENCES item (item_id),
  quantity                DECIMAL(19,3) NOT NULL CHECK (quantity > 0),
  units_per_order         DECIMAL(19,3) NOT NULL CHECK (units_per_order > 0),
  unit_price              DECIMAL(19,2) NOT NULL,
  product_name            VARCHAR(100) NOT NULL,
  product_ref             VARCHAR(255),
  purchase_unit           VARCHAR(10) NOT NULL,
  line_status             VARCHAR(20) NOT NULL DEFAULT 'ORDERED' CHECK (line_status IN ('ORDERED', 'ACCEPTED', 'REJECTED', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CLOSED_REMAINING')),
  closed_at               TIMESTAMPTZ,
  close_reason            VARCHAR(255),
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE purchase_order_item IS '발주 품목';
COMMENT ON COLUMN purchase_order_item.purchase_order_item_id IS '발주 품목 ID';
COMMENT ON COLUMN purchase_order_item.store_id IS '매장. 부모 행과 같은 값 (매장 분리 확인용, AGENTS.md 3-2)';
COMMENT ON COLUMN purchase_order_item.purchase_order_id IS '발주 (v1.1 po_id)';
COMMENT ON COLUMN purchase_order_item.item_id IS '품목';
COMMENT ON COLUMN purchase_order_item.quantity IS '주문 수량 (구매 단위)';
COMMENT ON COLUMN purchase_order_item.units_per_order IS '발주 당시 구매 단위 1개당 관리 단위 수량 사본';
COMMENT ON COLUMN purchase_order_item.unit_price IS '단가 (구매 단위)';
COMMENT ON COLUMN purchase_order_item.product_name IS '주문 당시 공급처 상품명';
COMMENT ON COLUMN purchase_order_item.product_ref IS '공급처 상품 코드 또는 URL 사본';
COMMENT ON COLUMN purchase_order_item.purchase_unit IS '주문 당시 구매 단위';
COMMENT ON COLUMN purchase_order_item.line_status IS 'ORDERED 주문 / ACCEPTED 접수 / REJECTED 거절 / PARTIALLY_RECEIVED 부분입고 / RECEIVED 입고완료 / CLOSED_REMAINING 잔량종료';
COMMENT ON COLUMN purchase_order_item.closed_at IS '거절·잔량종료 처리 시각';
COMMENT ON COLUMN purchase_order_item.close_reason IS '거절·잔량종료 사유. 예: 공급처 품절, 미배송 확정';
COMMENT ON COLUMN purchase_order_item.created_at IS '생성 시각';
COMMENT ON COLUMN purchase_order_item.updated_at IS '수정 시각 (앱에서 갱신)';

-- ----------------------------------------------------------------------
-- receipt_item: 입고 확인 (도착분을 정상·파손·오배송으로 구분)
--   도메인: 거래처·발주·입고 · 담당: 준표 · 추가만 하고 수정하지 않는 표
-- ----------------------------------------------------------------------
CREATE TABLE receipt_item (
  receipt_item_id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  store_id                BIGINT NOT NULL REFERENCES store (store_id),
  purchase_order_item_id  BIGINT NOT NULL REFERENCES purchase_order_item (purchase_order_item_id),
  arrived_qty             DECIMAL(19,3) NOT NULL,
  arrived_at              TIMESTAMPTZ,
  expiry_date             DATE,
  normal_qty              DECIMAL(19,3) NOT NULL,
  damaged_qty             DECIMAL(19,3) NOT NULL DEFAULT 0,
  wrong_qty               DECIMAL(19,3) NOT NULL DEFAULT 0,
  confirmed_at            TIMESTAMPTZ NOT NULL,
  idempotency_key         VARCHAR(100) NOT NULL,
  issue_note              VARCHAR(500),
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (idempotency_key)
);

COMMENT ON TABLE receipt_item IS '입고 확인 (도착분을 정상·파손·오배송으로 구분)';
COMMENT ON COLUMN receipt_item.receipt_item_id IS '입고 확인 ID';
COMMENT ON COLUMN receipt_item.store_id IS '매장. 부모 행과 같은 값 (매장 분리 확인용, AGENTS.md 3-2)';
COMMENT ON COLUMN receipt_item.purchase_order_item_id IS '발주 품목 (v1.1 po_item_id)';
COMMENT ON COLUMN receipt_item.arrived_qty IS '이번에 도착한 수량 (구매 단위)';
COMMENT ON COLUMN receipt_item.arrived_at IS '실제 도착 시각. 입력하지 않으면 confirmed_at과 같음';
COMMENT ON COLUMN receipt_item.expiry_date IS '이번 입고분 소비기한. 선택 입력';
COMMENT ON COLUMN receipt_item.normal_qty IS '정상으로 확정한 수량. 이 수량만 가용 재고에 반영';
COMMENT ON COLUMN receipt_item.damaged_qty IS '파손 수량';
COMMENT ON COLUMN receipt_item.wrong_qty IS '오배송 수량';
COMMENT ON COLUMN receipt_item.confirmed_at IS '확정 시각';
COMMENT ON COLUMN receipt_item.idempotency_key IS '같은 확정을 두 번 반영하지 않기 위한 키';
COMMENT ON COLUMN receipt_item.issue_note IS '파손·오배송 등 현장 확인 내용. 후속 보류 상태 이력은 관리하지 않음';
COMMENT ON COLUMN receipt_item.created_at IS '생성 시각';

-- ----------------------------------------------------------------------
-- inventory_transaction: 재료별 재고 변동 장부와 판매 원가 사본
--   도메인: 재고·원가 · 담당: 준표 · 추가만 하고 수정하지 않는 표
-- ----------------------------------------------------------------------
CREATE TABLE inventory_transaction (
  inventory_transaction_id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  store_id                           BIGINT NOT NULL REFERENCES store (store_id),
  item_id                            BIGINT NOT NULL REFERENCES item (item_id),
  txn_type                           VARCHAR(20) NOT NULL CHECK (txn_type IN ('SALE', 'CANCEL', 'RECEIPT', 'DISPOSAL', 'LOSS')),
  qty_delta                          DECIMAL(19,3) NOT NULL,
  unit_cost                          DECIMAL(19,4),
  sales_order_item_id                BIGINT REFERENCES sales_order_item (sales_order_item_id),
  receipt_item_id                    BIGINT REFERENCES receipt_item (receipt_item_id),
  reversed_inventory_transaction_id  BIGINT REFERENCES inventory_transaction (inventory_transaction_id),
  occurred_at                        TIMESTAMPTZ NOT NULL,
  recorded_at                        TIMESTAMPTZ NOT NULL,
  idempotency_key                    VARCHAR(100) NOT NULL,
  memo                               VARCHAR(255),
  created_at                         TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (idempotency_key, item_id)
);

COMMENT ON TABLE inventory_transaction IS '재료별 재고 변동 장부와 판매 원가 사본';
COMMENT ON COLUMN inventory_transaction.inventory_transaction_id IS '변동 ID';
COMMENT ON COLUMN inventory_transaction.store_id IS '매장. 부모 행과 같은 값 (매장 분리 확인용, AGENTS.md 3-2)';
COMMENT ON COLUMN inventory_transaction.item_id IS '재료·포장재';
COMMENT ON COLUMN inventory_transaction.txn_type IS 'SALE 판매차감 / CANCEL 취소환원 / RECEIPT 입고 / DISPOSAL 폐기 / LOSS 손실';
COMMENT ON COLUMN inventory_transaction.qty_delta IS '관리 단위 증감량. 입고·환원은 양수, 차감·폐기·손실은 음수';
COMMENT ON COLUMN inventory_transaction.unit_cost IS '발생 시점 단가 사본. 취소환원은 원래 판매차감 단가';
COMMENT ON COLUMN inventory_transaction.sales_order_item_id IS '판매차감·취소환원의 근거 판매 항목';
COMMENT ON COLUMN inventory_transaction.receipt_item_id IS '입고의 근거 확인';
COMMENT ON COLUMN inventory_transaction.reversed_inventory_transaction_id IS '취소환원이 되돌리는 판매차감 행 (v1.1 reverses_txn_id)';
COMMENT ON COLUMN inventory_transaction.occurred_at IS '재고 변동 발생 시각';
COMMENT ON COLUMN inventory_transaction.recorded_at IS '시스템 반영 시각';
COMMENT ON COLUMN inventory_transaction.idempotency_key IS '사건 중복 방지 키. 판매차감 SALE:{orderItemId}, 취소환원 CANCEL:{orderItemId}:{누적취소수량} (item_id와 묶어서 UQ: 한 판매 항목이 재료 여러 행을 만듦)';
COMMENT ON COLUMN inventory_transaction.memo IS '수동 폐기·손실 사유';
COMMENT ON COLUMN inventory_transaction.created_at IS '생성 시각';

-- ----------------------------------------------------------------------
-- stock_count: 실사 기록 (초기 재고 포함)
--   도메인: 재고·원가 · 담당: 준표 · 추가만 하고 수정하지 않는 표
-- ----------------------------------------------------------------------
CREATE TABLE stock_count (
  stock_count_id  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  store_id        BIGINT NOT NULL REFERENCES store (store_id),
  item_id         BIGINT NOT NULL REFERENCES item (item_id),
  count_type      VARCHAR(10) NOT NULL CHECK (count_type IN ('INITIAL', 'COUNT')),
  estimated_qty   DECIMAL(19,3),
  counted_qty     DECIMAL(19,3) NOT NULL,
  counted_at      TIMESTAMPTZ NOT NULL,
  memo            VARCHAR(255),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (item_id, counted_at)
);

COMMENT ON TABLE stock_count IS '실사 기록 (초기 재고 포함)';
COMMENT ON COLUMN stock_count.stock_count_id IS '실사 ID';
COMMENT ON COLUMN stock_count.store_id IS '매장';
COMMENT ON COLUMN stock_count.item_id IS '품목';
COMMENT ON COLUMN stock_count.count_type IS 'INITIAL 초기 / COUNT 실사';
COMMENT ON COLUMN stock_count.estimated_qty IS '실사 시점 추정 재고 (초기 재고면 NULL)';
COMMENT ON COLUMN stock_count.counted_qty IS '실제 확인 수량';
COMMENT ON COLUMN stock_count.counted_at IS '기준 일시 (초기 재고는 재고 계산 시작 시점)';
COMMENT ON COLUMN stock_count.memo IS '메모';
COMMENT ON COLUMN stock_count.created_at IS '생성 시각';

-- ----------------------------------------------------------------------
-- bank_account: 금융 연동 계좌 (사장님이 등록·관리)
--   도메인: 입출금·비용 · 담당: 예원
-- ----------------------------------------------------------------------
CREATE TABLE bank_account (
  bank_account_id   BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  store_id          BIGINT NOT NULL REFERENCES store (store_id),
  integration_id    BIGINT NOT NULL REFERENCES integration (integration_id),
  institution_name  VARCHAR(50) NOT NULL,
  account_mask      VARCHAR(30) NOT NULL,
  account_ref       VARCHAR(100) NOT NULL,
  alias             VARCHAR(50),
  account_type      VARCHAR(10) NOT NULL DEFAULT 'DEPOSIT' CHECK (account_type IN ('DEPOSIT', 'CARD')),
  purpose           VARCHAR(20) NOT NULL DEFAULT 'OTHER' CHECK (purpose IN ('SETTLEMENT', 'OPERATING', 'OTHER')),
  is_included       BOOLEAN NOT NULL DEFAULT TRUE,
  is_primary        BOOLEAN NOT NULL DEFAULT FALSE,
  status            VARCHAR(10) NOT NULL DEFAULT 'CONNECTED' CHECK (status IN ('CONNECTED', 'CLOSED', 'ERROR')),
  balance           DECIMAL(19,2),
  balance_at        TIMESTAMPTZ,
  connected_at      TIMESTAMPTZ NOT NULL,
  disconnected_at   TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (integration_id, account_ref)
);
CREATE UNIQUE INDEX uq_bank_account_primary ON bank_account (store_id) WHERE is_primary;

COMMENT ON TABLE bank_account IS '금융 연동 계좌 (사장님이 등록·관리)';
COMMENT ON COLUMN bank_account.bank_account_id IS '계좌 ID';
COMMENT ON COLUMN bank_account.store_id IS '매장';
COMMENT ON COLUMN bank_account.integration_id IS '금융 연동 (provider = OPEN_BANKING)';
COMMENT ON COLUMN bank_account.institution_name IS '은행·카드사명';
COMMENT ON COLUMN bank_account.account_mask IS '가린 계좌번호. 예: 123-***-4567';
COMMENT ON COLUMN bank_account.account_ref IS '연동 서비스의 계좌 식별자. 오픈뱅킹 핀테크이용번호(24자리) (integration_id와 묶어서 UQ)';
COMMENT ON COLUMN bank_account.alias IS '사장님이 붙인 계좌 별칭. 예: 정산 통장';
COMMENT ON COLUMN bank_account.account_type IS 'DEPOSIT 입출금 / CARD 카드';
COMMENT ON COLUMN bank_account.purpose IS 'SETTLEMENT 매출정산 / OPERATING 운영비 / OTHER 기타. 입금 자동 분류의 근거';
COMMENT ON COLUMN bank_account.is_included IS '입출금 조회·비용 중복 후보에 포함할지';
COMMENT ON COLUMN bank_account.is_primary IS '대표 계좌. 매장당 최대 1개 (부분 UQ)';
COMMENT ON COLUMN bank_account.status IS 'CONNECTED 연결 / CLOSED 해지 / ERROR 오류';
COMMENT ON COLUMN bank_account.balance IS '최근 조회한 잔액 사본';
COMMENT ON COLUMN bank_account.balance_at IS '잔액 조회 시각';
COMMENT ON COLUMN bank_account.connected_at IS '계좌 등록 시각';
COMMENT ON COLUMN bank_account.disconnected_at IS '계좌 해지 시각. 해지 후에도 과거 거래 보존';
COMMENT ON COLUMN bank_account.created_at IS '생성 시각';
COMMENT ON COLUMN bank_account.updated_at IS '수정 시각 (앱에서 갱신)';

-- ----------------------------------------------------------------------
-- bank_transaction: 입출금 거래 (금융 거래일 기준)
--   도메인: 입출금·비용 · 담당: 예원
-- ----------------------------------------------------------------------
CREATE TABLE bank_transaction (
  bank_transaction_id  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  store_id             BIGINT NOT NULL REFERENCES store (store_id),
  bank_account_id      BIGINT NOT NULL REFERENCES bank_account (bank_account_id),
  external_txn_id      VARCHAR(100) NOT NULL,
  txn_at               TIMESTAMPTZ NOT NULL,
  txn_time_precision   VARCHAR(10) NOT NULL CHECK (txn_time_precision IN ('DATE', 'TIME')),
  direction            VARCHAR(10) NOT NULL CHECK (direction IN ('IN', 'OUT')),
  amount               DECIMAL(19,2) NOT NULL CHECK (amount > 0),
  balance_after        DECIMAL(19,2),
  description          VARCHAR(255),
  category             VARCHAR(20) NOT NULL DEFAULT 'NEEDS_CHECK' CHECK (category IN ('SETTLEMENT', 'PAYROLL', 'RENT', 'UTILITY', 'SUPPLIER_PAYMENT', 'FEE', 'OTHER', 'NEEDS_CHECK')),
  category_source      VARCHAR(10) NOT NULL DEFAULT 'AUTO' CHECK (category_source IN ('AUTO', 'OWNER')),
  purchase_order_id    BIGINT REFERENCES purchase_order (purchase_order_id),
  received_at          TIMESTAMPTZ NOT NULL,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (bank_account_id, external_txn_id)
);

COMMENT ON TABLE bank_transaction IS '입출금 거래 (금융 거래일 기준)';
COMMENT ON COLUMN bank_transaction.bank_transaction_id IS '거래 ID';
COMMENT ON COLUMN bank_transaction.store_id IS '매장. 부모 행과 같은 값 (매장 분리 확인용, AGENTS.md 3-2)';
COMMENT ON COLUMN bank_transaction.bank_account_id IS '계좌 (v1.1 account_id)';
COMMENT ON COLUMN bank_transaction.external_txn_id IS '연동 서비스의 거래 식별자 (bank_account_id와 묶어서 UQ). 중복 수집 방지. 오픈뱅킹에 거래 고유 ID가 없으면 거래일시·입출금구분·금액·거래후잔액·적요 해시로 생성';
COMMENT ON COLUMN bank_transaction.txn_at IS '금융 거래일시. 날짜만 제공되면 한국 시간 해당일 00:00:00';
COMMENT ON COLUMN bank_transaction.txn_time_precision IS '원본 정밀도 DATE / TIME. DATE의 00:00:00은 실제 거래 시각이 아님';
COMMENT ON COLUMN bank_transaction.direction IS 'IN 입금 / OUT 출금';
COMMENT ON COLUMN bank_transaction.amount IS '금액 (양수)';
COMMENT ON COLUMN bank_transaction.balance_after IS '거래 후 잔액';
COMMENT ON COLUMN bank_transaction.description IS '적요·상대방';
COMMENT ON COLUMN bank_transaction.category IS 'SETTLEMENT 정산입금 / PAYROLL 인건비 / RENT 임대료 / UTILITY 공과금 / SUPPLIER_PAYMENT 거래처대금 / FEE 수수료 / OTHER 기타 / NEEDS_CHECK 확인필요';
COMMENT ON COLUMN bank_transaction.category_source IS 'AUTO 자동분류 / OWNER 사장님확인';
COMMENT ON COLUMN bank_transaction.purchase_order_id IS '거래처 대금이면 연결한 발주 (v1.1 po_id)';
COMMENT ON COLUMN bank_transaction.received_at IS '수집 시각';
COMMENT ON COLUMN bank_transaction.created_at IS '생성 시각';
COMMENT ON COLUMN bank_transaction.updated_at IS '수정 시각 (앱에서 갱신)';

-- ----------------------------------------------------------------------
-- sales_payment: POS 결제 내역과 통장 입금 대사
--   도메인: 판매·매출 · 담당: 예원
-- ----------------------------------------------------------------------
CREATE TABLE sales_payment (
  sales_payment_id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  store_id                 BIGINT NOT NULL REFERENCES store (store_id),
  sales_order_id           BIGINT NOT NULL REFERENCES sales_order (sales_order_id),
  external_payment_id      VARCHAR(100) NOT NULL,
  method                   VARCHAR(20) NOT NULL CHECK (method IN ('CARD', 'CASH', 'EASY_PAY', 'OTHER')),
  card_company             VARCHAR(30),
  amount                   DECIMAL(19,2) NOT NULL,
  approved_at              TIMESTAMPTZ NOT NULL,
  status                   VARCHAR(10) NOT NULL CHECK (status IN ('APPROVED', 'CANCELED')),
  canceled_at              TIMESTAMPTZ,
  expected_deposit_date    DATE,
  expected_deposit_amount  DECIMAL(19,2),
  bank_transaction_id      BIGINT REFERENCES bank_transaction (bank_transaction_id),
  match_status             VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (match_status IN ('PENDING', 'MATCHED', 'AMOUNT_MISMATCH', 'MISSING_SUSPECTED', 'NOT_APPLICABLE')),
  matched_at               TIMESTAMPTZ,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (sales_order_id, external_payment_id)
);

COMMENT ON TABLE sales_payment IS 'POS 결제 내역과 통장 입금 대사';
COMMENT ON COLUMN sales_payment.sales_payment_id IS '결제 ID';
COMMENT ON COLUMN sales_payment.store_id IS '매장. 부모 행과 같은 값 (매장 분리 확인용, AGENTS.md 3-2)';
COMMENT ON COLUMN sales_payment.sales_order_id IS '주문 (v1.1 order_id)';
COMMENT ON COLUMN sales_payment.external_payment_id IS 'POS 결제 식별자. 토스플레이스 paymentId (sales_order_id와 묶어서 UQ)';
COMMENT ON COLUMN sales_payment.method IS 'CARD 카드 / CASH 현금 / EASY_PAY 간편결제 / OTHER 기타';
COMMENT ON COLUMN sales_payment.card_company IS '매입 카드사. 지급주기·수수료 계산용';
COMMENT ON COLUMN sales_payment.amount IS '결제 금액';
COMMENT ON COLUMN sales_payment.approved_at IS '승인 시각';
COMMENT ON COLUMN sales_payment.status IS 'APPROVED 승인 / CANCELED 취소';
COMMENT ON COLUMN sales_payment.canceled_at IS '취소 시각';
COMMENT ON COLUMN sales_payment.expected_deposit_date IS '예상 입금일. 카드사 지급주기로 계산';
COMMENT ON COLUMN sales_payment.expected_deposit_amount IS '예상 입금액. 가맹점 수수료 차감';
COMMENT ON COLUMN sales_payment.bank_transaction_id IS '매칭된 실제 입금 거래 (v1.1 bank_txn_id)';
COMMENT ON COLUMN sales_payment.match_status IS 'PENDING 대기 / MATCHED 정상 / AMOUNT_MISMATCH 금액차이 / MISSING_SUSPECTED 누락의심 / NOT_APPLICABLE 대상아님 (현금)';
COMMENT ON COLUMN sales_payment.matched_at IS '대사 처리 시각';
COMMENT ON COLUMN sales_payment.created_at IS '생성 시각';
COMMENT ON COLUMN sales_payment.updated_at IS '수정 시각 (앱에서 갱신)';

-- ----------------------------------------------------------------------
-- expense: 운영 비용 (수동 입력·금융 거래 연결)
--   도메인: 입출금·비용 · 담당: 예원
-- ----------------------------------------------------------------------
CREATE TABLE expense (
  expense_id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  store_id             BIGINT NOT NULL REFERENCES store (store_id),
  category             VARCHAR(30) NOT NULL CHECK (category IN ('RENT', 'PAYROLL', 'FEE', 'UTILITY', 'OTHER')),
  amount               DECIMAL(19,2) NOT NULL,
  period_start         DATE NOT NULL,
  period_end           DATE NOT NULL,
  source               VARCHAR(10) NOT NULL CHECK (source IN ('MANUAL', 'BANK')),
  bank_transaction_id  BIGINT REFERENCES bank_transaction (bank_transaction_id),
  allocation           VARCHAR(20) NOT NULL CHECK (allocation IN ('EVEN', 'ON_DATE')),
  status               VARCHAR(20) NOT NULL DEFAULT 'APPLIED' CHECK (status IN ('APPLIED', 'DUPLICATE_CANDIDATE', 'EXCLUDED')),
  memo                 VARCHAR(255),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (bank_transaction_id),
  CHECK (period_end >= period_start)
);

COMMENT ON TABLE expense IS '운영 비용 (수동 입력·금융 거래 연결)';
COMMENT ON COLUMN expense.expense_id IS '비용 ID';
COMMENT ON COLUMN expense.store_id IS '매장';
COMMENT ON COLUMN expense.category IS 'RENT 임대료 / PAYROLL 인건비 / FEE 수수료 / UTILITY 공과금 / OTHER 기타 (원재료 구매 대금은 넣지 않음)';
COMMENT ON COLUMN expense.amount IS '금액';
COMMENT ON COLUMN expense.period_start IS '적용 시작일';
COMMENT ON COLUMN expense.period_end IS '적용 종료일';
COMMENT ON COLUMN expense.source IS 'MANUAL 수동입력 / BANK 금융연동';
COMMENT ON COLUMN expense.bank_transaction_id IS '근거 금융 거래. UQ라서 같은 거래로 비용을 두 번 만들 수 없음 (v1.1 bank_txn_id)';
COMMENT ON COLUMN expense.allocation IS '기간 배분 방식: EVEN 기간균등 / ON_DATE 발생일';
COMMENT ON COLUMN expense.status IS 'APPLIED 반영 / DUPLICATE_CANDIDATE 중복후보 / EXCLUDED 제외';
COMMENT ON COLUMN expense.memo IS '메모';
COMMENT ON COLUMN expense.created_at IS '생성 시각';
COMMENT ON COLUMN expense.updated_at IS '수정 시각 (앱에서 갱신)';

-- ----------------------------------------------------------------------
-- coupon: 승인된 쿠폰과 POS 반영 상태
--   도메인: 쿠폰 · 담당: 예원
-- ----------------------------------------------------------------------
CREATE TABLE coupon (
  coupon_id        BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  store_id         BIGINT NOT NULL REFERENCES store (store_id),
  approval_id      BIGINT NOT NULL REFERENCES approval (approval_id),
  integration_id   BIGINT NOT NULL REFERENCES integration (integration_id),
  name             VARCHAR(100) NOT NULL,
  conditions       JSONB NOT NULL,
  valid_from       DATE NOT NULL,
  valid_to         DATE NOT NULL,
  issue_qty        INTEGER,
  usage_limit_qty  INTEGER,
  pos_sync_status  VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (pos_sync_status IN ('PENDING', 'SYNCED', 'FAILED', 'CHECKING', 'UNSUPPORTED')),
  pos_coupon_code  VARCHAR(100),
  pos_synced_at    TIMESTAMPTZ,
  workflow_key     VARCHAR(64) NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (integration_id, pos_coupon_code),
  UNIQUE (workflow_key),
  CHECK (valid_to >= valid_from)
);

COMMENT ON TABLE coupon IS '승인된 쿠폰과 POS 반영 상태';
COMMENT ON COLUMN coupon.coupon_id IS '쿠폰 ID';
COMMENT ON COLUMN coupon.store_id IS '매장';
COMMENT ON COLUMN coupon.approval_id IS '근거 승인';
COMMENT ON COLUMN coupon.integration_id IS '반영할 POS';
COMMENT ON COLUMN coupon.name IS '쿠폰명';
COMMENT ON COLUMN coupon.conditions IS '승인한 최종 조건 사본: 적용 메뉴, 할인, 시간대, 최소 주문, 사용 제한. 키는 camelCase';
COMMENT ON COLUMN coupon.valid_from IS '운영 시작일';
COMMENT ON COLUMN coupon.valid_to IS '운영 종료일';
COMMENT ON COLUMN coupon.issue_qty IS '발행 수량';
COMMENT ON COLUMN coupon.usage_limit_qty IS '사용 한도';
COMMENT ON COLUMN coupon.pos_sync_status IS 'PENDING 반영대기 / SYNCED 반영완료 / FAILED 실패 / CHECKING 결과확인중 / UNSUPPORTED 미지원';
COMMENT ON COLUMN coupon.pos_coupon_code IS 'POS의 쿠폰·프로모션 식별자 (integration_id와 묶어서 UQ). 사용 내역 매칭에 사용. 토스플레이스는 할인정책 ID(discountPolicyId), 신규 생성 미지원 시 NULL';
COMMENT ON COLUMN coupon.pos_synced_at IS '반영 완료 확인 시각';
COMMENT ON COLUMN coupon.workflow_key IS '한 쿠폰 업무의 키. 버전 변경에도 동일 쿠폰 유지';
COMMENT ON COLUMN coupon.created_at IS '생성 시각';
COMMENT ON COLUMN coupon.updated_at IS '수정 시각 (앱에서 갱신)';

-- ----------------------------------------------------------------------
-- execution: 승인된 발주·쿠폰 요청의 외부 처리 상태
--   도메인: 제안·승인·실행 · 담당: 예원 (승인 공통)
-- ----------------------------------------------------------------------
CREATE TABLE execution (
  execution_id        BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  store_id            BIGINT NOT NULL REFERENCES store (store_id),
  approval_id         BIGINT NOT NULL REFERENCES approval (approval_id),
  purchase_order_id   BIGINT REFERENCES purchase_order (purchase_order_id),
  coupon_id           BIGINT REFERENCES coupon (coupon_id),
  operation           VARCHAR(20) NOT NULL CHECK (operation IN ('PURCHASE_ORDER_SEND', 'COUPON_CREATE', 'COUPON_UPDATE')),
  idempotency_key     VARCHAR(100) NOT NULL,
  exec_status         VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (exec_status IN ('PENDING', 'RUNNING', 'SUCCEEDED', 'FAILED', 'PARTIALLY_SUCCEEDED', 'CHECKING', 'MANUALLY_CLOSED')),
  scope_check         JSONB,
  request_body        JSONB NOT NULL,
  external_ref        VARCHAR(100),
  result_summary      JSONB,
  error_msg           VARCHAR(500),
  langsmith_trace_id  VARCHAR(64),
  executed_at         TIMESTAMPTZ,
  last_checked_at     TIMESTAMPTZ,
  resolved_at         TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (idempotency_key)
);

COMMENT ON TABLE execution IS '승인된 발주·쿠폰 요청의 외부 처리 상태';
COMMENT ON COLUMN execution.execution_id IS '외부 요청 ID';
COMMENT ON COLUMN execution.store_id IS '매장. 부모 행과 같은 값 (매장 분리 확인용, AGENTS.md 3-2)';
COMMENT ON COLUMN execution.approval_id IS '승인 결정';
COMMENT ON COLUMN execution.purchase_order_id IS '발주 전송 대상 (v1.1 po_id)';
COMMENT ON COLUMN execution.coupon_id IS '쿠폰 POS 등록·변경 대상';
COMMENT ON COLUMN execution.operation IS 'PURCHASE_ORDER_SEND 발주전송 / COUPON_CREATE 쿠폰등록 / COUPON_UPDATE 쿠폰변경';
COMMENT ON COLUMN execution.idempotency_key IS '업무 대상·작업·요청 내용에 대한 안정적인 중복 방지 키';
COMMENT ON COLUMN execution.exec_status IS 'PENDING 대기 / RUNNING 처리중 / SUCCEEDED 성공 / FAILED 실패 / PARTIALLY_SUCCEEDED 부분성공 / CHECKING 결과확인중 / MANUALLY_CLOSED 수동종료';
COMMENT ON COLUMN execution.scope_check IS '실행 직전 승인 범위·현재 조건 검증 결과. 전송 전 필수. 키는 camelCase';
COMMENT ON COLUMN execution.request_body IS '실제 승인·전송할 요청 사본';
COMMENT ON COLUMN execution.external_ref IS '외부 주문·처리 식별자';
COMMENT ON COLUMN execution.result_summary IS '사용자에게 필요한 결과·확인된 성공 범위. 키는 camelCase';
COMMENT ON COLUMN execution.error_msg IS '사용자 안내 오류';
COMMENT ON COLUMN execution.langsmith_trace_id IS '상세 도구 호출 추적';
COMMENT ON COLUMN execution.executed_at IS '전송 시각';
COMMENT ON COLUMN execution.last_checked_at IS '최근 외부 결과 확인 시각';
COMMENT ON COLUMN execution.resolved_at IS '사장님이 부분성공·결과확인중 요청을 외부에서 확인하고 수동종료한 시각';
COMMENT ON COLUMN execution.created_at IS '생성 시각';
COMMENT ON COLUMN execution.updated_at IS '수정 시각 (앱에서 갱신)';

-- ----------------------------------------------------------------------
-- coupon_redemption: POS 쿠폰 사용 내역 (사용·취소·환불 이벤트)
--   도메인: 쿠폰 · 담당: 예원
-- ----------------------------------------------------------------------
CREATE TABLE coupon_redemption (
  coupon_redemption_id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  store_id                       BIGINT NOT NULL REFERENCES store (store_id),
  integration_id                 BIGINT NOT NULL REFERENCES integration (integration_id),
  external_event_id              VARCHAR(100) NOT NULL,
  pos_coupon_code                VARCHAR(100) NOT NULL,
  coupon_id                      BIGINT REFERENCES coupon (coupon_id),
  sales_order_id                 BIGINT REFERENCES sales_order (sales_order_id),
  event_type                     VARCHAR(10) NOT NULL CHECK (event_type IN ('USE', 'CANCEL', 'REFUND')),
  discount_amount                DECIMAL(19,2) NOT NULL,
  order_amount                   DECIMAL(19,2),
  occurred_at                    TIMESTAMPTZ NOT NULL,
  received_at                    TIMESTAMPTZ NOT NULL,
  original_coupon_redemption_id  BIGINT REFERENCES coupon_redemption (coupon_redemption_id),
  created_at                     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (integration_id, external_event_id)
);

COMMENT ON TABLE coupon_redemption IS 'POS 쿠폰 사용 내역 (사용·취소·환불 이벤트)';
COMMENT ON COLUMN coupon_redemption.coupon_redemption_id IS '사용 내역 ID';
COMMENT ON COLUMN coupon_redemption.store_id IS '매장. 부모 행과 같은 값 (매장 분리 확인용, AGENTS.md 3-2)';
COMMENT ON COLUMN coupon_redemption.integration_id IS '수집한 POS';
COMMENT ON COLUMN coupon_redemption.external_event_id IS 'POS 이벤트 식별자 (integration_id와 묶어서 UQ). 중복 수집 방지';
COMMENT ON COLUMN coupon_redemption.pos_coupon_code IS 'POS가 보낸 쿠폰 식별자';
COMMENT ON COLUMN coupon_redemption.coupon_id IS '매칭된 쿠폰 (매칭 전이면 NULL)';
COMMENT ON COLUMN coupon_redemption.sales_order_id IS '적용 주문 (연결할 수 있을 때, v1.1 order_id)';
COMMENT ON COLUMN coupon_redemption.event_type IS 'USE 사용 / CANCEL 취소 / REFUND 환불';
COMMENT ON COLUMN coupon_redemption.discount_amount IS '할인액. 취소·환불은 음수';
COMMENT ON COLUMN coupon_redemption.order_amount IS '적용 주문 결제액';
COMMENT ON COLUMN coupon_redemption.occurred_at IS '발생 시각';
COMMENT ON COLUMN coupon_redemption.received_at IS '수집 시각';
COMMENT ON COLUMN coupon_redemption.original_coupon_redemption_id IS '취소·환불이 되돌리는 사용 이벤트 (v1.1 original_redemption_id)';
COMMENT ON COLUMN coupon_redemption.created_at IS '생성 시각';
COMMENT ON COLUMN coupon_redemption.updated_at IS '수정 시각 (앱에서 갱신)';

-- ----------------------------------------------------------------------
-- schedule: 운영 일정 (행사 API 수집·사장님 직접 입력). 2주 범위 밖 → 3주차
--   도메인: 일정·수요 예측 · 담당: 미정 (3주차)
-- ----------------------------------------------------------------------
CREATE TABLE schedule (
  schedule_id      BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  store_id         BIGINT NOT NULL REFERENCES store (store_id),
  source           VARCHAR(10) NOT NULL CHECK (source IN ('EVENT_API', 'MANUAL')),
  external_ref     VARCHAR(100),
  schedule_type    VARCHAR(20) NOT NULL CHECK (schedule_type IN ('LOCAL_EVENT', 'EXAM', 'VACATION', 'TEMP_CLOSURE', 'OTHER')),
  title            VARCHAR(100) NOT NULL,
  start_at         TIMESTAMPTZ NOT NULL,
  end_at           TIMESTAMPTZ NOT NULL,
  is_all_day       BOOLEAN NOT NULL DEFAULT TRUE,
  location         VARCHAR(255),
  expected_impact  VARCHAR(10) CHECK (expected_impact IN ('INCREASE', 'DECREASE', 'UNKNOWN')),
  is_hidden        BOOLEAN NOT NULL DEFAULT FALSE,
  memo             VARCHAR(255),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (store_id, source, external_ref),
  CHECK (end_at > start_at)
);

COMMENT ON TABLE schedule IS '운영 일정 (행사 API 수집·사장님 직접 입력). 2주 범위 밖 → 3주차';
COMMENT ON COLUMN schedule.schedule_id IS '일정 ID';
COMMENT ON COLUMN schedule.store_id IS '매장';
COMMENT ON COLUMN schedule.source IS 'EVENT_API 행사API / MANUAL 직접입력';
COMMENT ON COLUMN schedule.external_ref IS '행사 API의 원본 ID (store_id·source와 묶어서 UQ). 다시 수집해도 중복 생성하지 않음. 직접입력은 NULL';
COMMENT ON COLUMN schedule.schedule_type IS 'LOCAL_EVENT 지역행사 / EXAM 시험 / VACATION 방학 / TEMP_CLOSURE 임시휴무 / OTHER 기타';
COMMENT ON COLUMN schedule.title IS '일정명';
COMMENT ON COLUMN schedule.start_at IS '시작 시각. 종일 일정은 첫날 00:00';
COMMENT ON COLUMN schedule.end_at IS '종료 시각 (미포함). 종일 일정은 마지막 날의 다음 날 00:00';
COMMENT ON COLUMN schedule.is_all_day IS '종일 일정 여부 (행사 API는 대부분 날짜만 제공)';
COMMENT ON COLUMN schedule.location IS '장소. 행사 API의 주소 등';
COMMENT ON COLUMN schedule.expected_impact IS '사장님이 예상하는 매출 영향: INCREASE 증가 / DECREASE 감소 / UNKNOWN 모름. LLM 매출 분석에 참고로 넣음';
COMMENT ON COLUMN schedule.is_hidden IS '캘린더·분석에서 제외. 수집 일정은 삭제 대신 숨김';
COMMENT ON COLUMN schedule.memo IS '메모';
COMMENT ON COLUMN schedule.created_at IS '생성 시각';
COMMENT ON COLUMN schedule.updated_at IS '수정 시각 (앱에서 갱신)';

-- ----------------------------------------------------------------------
-- demand_forecast: 메뉴별 일 판매량 예측
--   도메인: 일정·수요 예측 · 담당: 준표 · AI 후상 · 추가만 하고 수정하지 않는 표
-- ----------------------------------------------------------------------
CREATE TABLE demand_forecast (
  demand_forecast_id  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  store_id            BIGINT NOT NULL REFERENCES store (store_id),
  menu_id             BIGINT NOT NULL REFERENCES menu (menu_id),
  target_date         DATE NOT NULL,
  predicted_qty       DECIMAL(10,2) NOT NULL,
  lower_qty           DECIMAL(10,2),
  upper_qty           DECIMAL(10,2),
  model_version       VARCHAR(30) NOT NULL,
  drivers             JSONB,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (menu_id, target_date, model_version)
);

COMMENT ON TABLE demand_forecast IS '메뉴별 일 판매량 예측';
COMMENT ON COLUMN demand_forecast.demand_forecast_id IS '예측 ID';
COMMENT ON COLUMN demand_forecast.store_id IS '매장';
COMMENT ON COLUMN demand_forecast.menu_id IS '기본 메뉴 (target_date·model_version과 묶어서 UQ)';
COMMENT ON COLUMN demand_forecast.target_date IS '예측 대상 영업일';
COMMENT ON COLUMN demand_forecast.predicted_qty IS '예측 판매 수량';
COMMENT ON COLUMN demand_forecast.lower_qty IS '예측 하한';
COMMENT ON COLUMN demand_forecast.upper_qty IS '예측 상한';
COMMENT ON COLUMN demand_forecast.model_version IS '모델 버전';
COMMENT ON COLUMN demand_forecast.drivers IS '주요 영향 요인과 예측에 쓴 날씨 요약·일정 ID 사본. 화면 근거 표시용. 예: {"factors":{"비":-0.15},"weather":{"max":3,"rainMm":5},"scheduleIds":[12]}';
COMMENT ON COLUMN demand_forecast.created_at IS '생성 시각';
