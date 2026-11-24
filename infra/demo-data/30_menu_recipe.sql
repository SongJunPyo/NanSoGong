-- ☕ 메뉴 · 옵션 · 레시피 · POS 메뉴 연결
--   POS 코드: 메뉴 M001…, 옵션 O001 (목업 mock/mappings/pos.json 과 같은 모양). M900 은 POS 에 새로 생긴 미연결 메뉴
--   포장 · 배달일 때만 컵 · 뚜껑(음료), 디저트 상자(C 디저트) → applies_to = TAKEOUT_DELIVERY
SET TIME ZONE 'Asia/Seoul';

CREATE TEMP TABLE demo_s AS
SELECT v.code, s.store_id, i.integration_id AS pos_integration_id
FROM (VALUES ('A', 'demo-office'), ('B', 'demo-campus'), ('C', 'demo-home')) AS v(code, login_id)
JOIN member m ON m.login_id = v.login_id JOIN store s ON s.member_id = m.member_id
JOIN integration i ON i.store_id = s.store_id AND i.provider = 'TOSS_PLACE';

CREATE TEMP TABLE demo_menu (code text, pos_code text, name text, category text, price numeric, spec text, parent_name text);
INSERT INTO demo_menu VALUES
('A', 'M001', '아메리카노',     '커피',     4000, NULL,   NULL),
('A', 'M002', '카페라떼',       '커피',     4500, NULL,   NULL),
('A', 'M003', '바닐라라떼',     '커피',     5000, NULL,   NULL),
('A', 'M004', '콜드브루',       '커피',     5000, NULL,   NULL),
('A', 'M005', '에그샌드위치',   '베이커리', 5500, NULL,   NULL),
('A', 'M006', '크림치즈베이글', '베이커리', 4500, NULL,   NULL),
('A', 'M007', '치즈케이크',     '디저트',   6000, NULL,   NULL),
('A', 'M008', '초코쿠키',       '디저트',   3000, NULL,   NULL),
('A', 'O001', '샷 추가',        '옵션',      500, NULL,   '아메리카노'),
('B', 'M001', '아메리카노(L)',  '커피',     2500, '24oz', NULL),
('B', 'M002', '카페라떼(L)',    '커피',     3500, '24oz', NULL),
('B', 'M003', '아이스티',       '음료',     3000, NULL,   NULL),
('B', 'M004', '햄치즈토스트',   '베이커리', 4500, NULL,   NULL),
('B', 'M005', '에그토스트',     '베이커리', 4000, NULL,   NULL),
('B', 'M006', '크로플',         '디저트',   4000, NULL,   NULL),
('B', 'M007', '초코쿠키',       '디저트',   2000, NULL,   NULL),
('B', 'O001', '샷 추가',        '옵션',      500, NULL,   '아메리카노(L)'),
('C', 'M001', '아메리카노',     '커피',     4500, NULL,   NULL),
('C', 'M002', '카페라떼',       '커피',     5000, NULL,   NULL),
('C', 'M003', '딸기라떼',       '음료',     6000, NULL,   NULL),
('C', 'M004', '소금빵',         '베이커리', 3500, NULL,   NULL),
('C', 'M005', '크로플',         '디저트',   5500, NULL,   NULL),
('C', 'M006', '티라미수',       '디저트',   6500, NULL,   NULL),
('C', 'M007', '당근케이크',     '디저트',   6500, NULL,   NULL),
('C', 'M008', '마카롱',         '디저트',   2800, NULL,   NULL),
('C', 'O001', '휘핑 추가',      '옵션',      500, NULL,   '크로플');

INSERT INTO menu (store_id, name, category, price, spec, sale_status, source, menu_type, parent_menu_id, created_at, updated_at)
SELECT d.store_id, x.name, x.category, x.price, x.spec, 'ON_SALE', 'POS', 'MENU', NULL, current_date - 1096, now()
FROM demo_menu x JOIN demo_s d ON d.code = x.code WHERE x.parent_name IS NULL;

INSERT INTO menu (store_id, name, category, price, spec, sale_status, source, menu_type, parent_menu_id, created_at, updated_at)
SELECT d.store_id, x.name, x.category, x.price, x.spec, 'ON_SALE', 'POS', 'OPTION', p.menu_id, current_date - 1096, now()
FROM demo_menu x JOIN demo_s d ON d.code = x.code
JOIN menu p ON p.store_id = d.store_id AND p.name = x.parent_name AND p.menu_type = 'MENU'
WHERE x.parent_name IS NOT NULL;

-- 레시피: 메뉴 1개당 사용량 (관리 단위). 옵션은 기본 대비 증감량
CREATE TEMP TABLE demo_recipe (code text, menu_name text, item_name text, qty numeric, source text);
INSERT INTO demo_recipe VALUES
('A', '아메리카노', '원두', 18, 'OWNER'),
('A', '카페라떼', '원두', 18, 'OWNER'), ('A', '카페라떼', '우유', 200, 'OWNER'),
('A', '바닐라라떼', '원두', 18, 'OWNER'), ('A', '바닐라라떼', '우유', 200, 'OWNER'), ('A', '바닐라라떼', '바닐라시럽', 20, 'OWNER'),
('A', '콜드브루', '콜드브루원액', 120, 'OWNER'),
('A', '에그샌드위치', '식빵', 2, 'OWNER'), ('A', '에그샌드위치', '계란', 2, 'OWNER'),
('A', '크림치즈베이글', '베이글', 1, 'OWNER'), ('A', '크림치즈베이글', '크림치즈', 30, 'AI_DRAFT'),
('A', '치즈케이크', '치즈케이크', 1, 'OWNER'),
('A', '초코쿠키', '초코쿠키', 1, 'OWNER'),
('A', '샷 추가', '원두', 9, 'OWNER'),
('B', '아메리카노(L)', '원두', 20, 'OWNER'),
('B', '카페라떼(L)', '원두', 20, 'OWNER'), ('B', '카페라떼(L)', '우유', 250, 'OWNER'),
('B', '아이스티', '아이스티파우더', 30, 'AI_DRAFT'),
('B', '햄치즈토스트', '식빵', 2, 'OWNER'), ('B', '햄치즈토스트', '햄', 1, 'OWNER'),
('B', '햄치즈토스트', '슬라이스치즈', 1, 'OWNER'), ('B', '햄치즈토스트', '버터', 5, 'OWNER'),
('B', '에그토스트', '식빵', 2, 'OWNER'), ('B', '에그토스트', '계란', 2, 'OWNER'), ('B', '에그토스트', '버터', 10, 'OWNER'),
('B', '크로플', '크로플생지', 1, 'OWNER'), ('B', '크로플', '버터', 5, 'OWNER'),
('B', '초코쿠키', '초코쿠키', 1, 'OWNER'),
('B', '샷 추가', '원두', 9, 'OWNER'),
('C', '아메리카노', '원두', 18, 'OWNER'),
('C', '카페라떼', '원두', 18, 'OWNER'), ('C', '카페라떼', '우유', 200, 'OWNER'),
('C', '딸기라떼', '딸기청', 50, 'OWNER'), ('C', '딸기라떼', '우유', 180, 'OWNER'),
('C', '소금빵', '소금빵생지', 1, 'OWNER'),
('C', '크로플', '크로플생지', 1, 'OWNER'), ('C', '크로플', '휘핑크림', 20, 'AI_DRAFT'),
('C', '티라미수', '티라미수', 1, 'OWNER'),
('C', '당근케이크', '당근케이크', 1, 'OWNER'),
('C', '마카롱', '마카롱', 1, 'OWNER'),
('C', '휘핑 추가', '휘핑크림', 20, 'OWNER');

INSERT INTO recipe_item (store_id, menu_id, item_id, quantity, applies_to, source, valid_from, valid_to, created_at, updated_at)
SELECT d.store_id, m.menu_id, it.item_id, r.qty, 'ALL', r.source, current_date - 1096, NULL::timestamptz, current_date - 1096, now()
FROM demo_recipe r JOIN demo_s d ON d.code = r.code
JOIN menu m  ON m.store_id = d.store_id AND m.name = r.menu_name
JOIN item it ON it.store_id = d.store_id AND it.name = r.item_name
UNION ALL   -- 포장 · 배달 음료: 컵 · 뚜껑
SELECT d.store_id, m.menu_id, it.item_id, 1, 'TAKEOUT_DELIVERY', 'OWNER', current_date - 1096, NULL, current_date - 1096, now()
FROM demo_s d JOIN menu m ON m.store_id = d.store_id
JOIN item it ON it.store_id = d.store_id AND it.name IN ('일회용컵', '컵뚜껑')
WHERE m.menu_type = 'MENU' AND m.category IN ('커피', '음료')
UNION ALL   -- 포장 · 배달 디저트 (C): 상자
SELECT d.store_id, m.menu_id, it.item_id, 1, 'TAKEOUT_DELIVERY', 'OWNER', current_date - 1096, NULL, current_date - 1096, now()
FROM demo_s d JOIN menu m ON m.store_id = d.store_id
JOIN item it ON it.store_id = d.store_id AND it.name = '디저트포장박스'
WHERE d.code = 'C' AND m.category = '디저트';

INSERT INTO pos_menu_mapping (store_id, integration_id, pos_menu_code, pos_option_code, pos_name, menu_id, status, created_at, updated_at)
SELECT d.store_id, d.pos_integration_id, x.pos_code, '', x.name, m.menu_id, 'MAPPED', current_date - 1096, now()
FROM demo_menu x JOIN demo_s d ON d.code = x.code
JOIN menu m ON m.store_id = d.store_id AND m.name = x.name AND m.menu_type = 'MENU'
WHERE x.parent_name IS NULL
UNION ALL   -- 옵션: 소속 메뉴 코드 + 옵션 코드
SELECT d.store_id, d.pos_integration_id, px.pos_code, x.pos_code, x.name, m.menu_id, 'MAPPED', current_date - 1096, now()
FROM demo_menu x JOIN demo_s d ON d.code = x.code
JOIN demo_menu px ON px.code = x.code AND px.name = x.parent_name
JOIN menu m ON m.store_id = d.store_id AND m.name = x.name AND m.menu_type = 'OPTION'
UNION ALL   -- POS 에 새로 생긴 메뉴: 아직 미연결 → 판매 항목 NEEDS_FIX, 데이터 보완 제안
SELECT d.store_id, d.pos_integration_id, 'M900', '', '겨울 한정 라떼', NULL, 'UNMAPPED', current_date - 14, now()
FROM demo_s d;
