-- 🗂️ Flyway 마이그레이션: 표를 만들고 고치는 SQL 은 전부 이 폴더에 쌓는다
--   새 파일 이름: V<연월일시분>__설명.sql  (예: V202611201430__create_store.sql)
--   → 6명이 동시에 만들어도 번호가 겹치지 않는다. 서버가 켜질 때 아직 안 돈 파일만 실행한다
--   로컬 · 테스트(Testcontainers) · AWS dev · AWS prod 가 모두 같은 파일로 같은 표 구조가 된다
-- 🚨 이미 머지된 파일은 절대 고치지 않는다 (체크섬이 달라져 서버가 뜨지 않는다). 고칠 게 있으면 새 파일을 만든다

-- 🧩 PostgreSQL 확장 (RDS 에서도 지원)
-- btree_gist: 같은 매장 · 같은 메뉴의 쿠폰 기간이 겹치지 않게 막는 EXCLUDE 제약에 필요 (구현-2-6)
--   예) EXCLUDE USING gist (store_id WITH =, period WITH &&)
CREATE EXTENSION IF NOT EXISTS btree_gist;
-- pg_trgm: POS 메뉴명 ↔ 앱 메뉴명 유사도로 연결 후보 자동 제안 (구현-1-14), 품목명 검색 (구현-3-4)
--   예) SELECT name, similarity(name, '아이스 아메리카노') FROM menu ORDER BY 2 DESC LIMIT 5
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ⏰ ShedLock 잠금 테이블 (common/SchedulingConfig). 날씨 수집 · 주간 실사 알림 · 수요 예측 · 보정 배치가 서버 여러 대에서 겹쳐 돌지 않게
CREATE TABLE shedlock (
    name       VARCHAR(64)  NOT NULL PRIMARY KEY,
    lock_until TIMESTAMP    NOT NULL,
    locked_at  TIMESTAMP    NOT NULL,
    locked_by  VARCHAR(255) NOT NULL
);
