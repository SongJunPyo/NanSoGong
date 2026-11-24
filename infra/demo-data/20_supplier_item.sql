-- 🚚 거래처 (API 연동 1곳 + 직접 주문 1곳) · 품목 12개씩 · 단가 이력
--   단가: 3년 전 기준가, 원두 · 우유는 500일 전에 8% 인상. 단가는 관리 단위(G · ML · EA) 1당 가격
--   purchase_config 는 원두 · 우유만 예시 (키 모양은 가정, 백엔드 DTO 가 정해지면 맞춘다)
SET TIME ZONE 'Asia/Seoul';

CREATE TEMP TABLE demo_s AS
SELECT v.code, s.store_id FROM (VALUES ('A', 'demo-office'), ('B', 'demo-campus'), ('C', 'demo-home')) AS v(code, login_id)
JOIN member m ON m.login_id = v.login_id JOIN store s ON s.member_id = m.member_id;

INSERT INTO supplier (store_id, name, source, integration_id, order_channel, contact, lead_time_days,
                      verify_status, verified_at, created_at, updated_at)
SELECT d.store_id, x.name, 'REGISTERED', CASE WHEN x.order_channel = 'API' THEN i.integration_id END,
       x.order_channel, x.contact, 1, 'VERIFIED', current_date - 1096, current_date - 1096, now()
FROM demo_s d
JOIN integration i ON i.store_id = d.store_id AND i.provider = 'SUPPLIER'
CROSS JOIN (VALUES ('한빛커피유통',     '02-0000-1001', 'API'),
                   ('다온베이커리포장', '02-0000-1002', 'MANUAL')) AS x(name, contact, order_channel);

CREATE TEMP TABLE demo_item (code text, name text, item_type text, category text, unit text,
                             purchase_unit text, pack_size numeric, pack_price numeric, supplier_name text);
INSERT INTO demo_item VALUES
-- A 모닝컵: 커피 · 아침 메뉴
('A', '원두',          'INGREDIENT', '커피',         'G',  '봉',   1000, 25000, '한빛커피유통'),
('A', '우유',          'INGREDIENT', '유제품',       'ML', '팩',   1000,  2500, '한빛커피유통'),
('A', '바닐라시럽',    'INGREDIENT', '시럽',         'ML', '병',   1000, 15000, '한빛커피유통'),
('A', '콜드브루원액',  'INGREDIENT', '커피',         'ML', '병',   1000, 12000, '한빛커피유통'),
('A', '계란',          'INGREDIENT', '신선',         'EA', '판',     30,  9000, '다온베이커리포장'),
('A', '식빵',          'INGREDIENT', '베이커리',     'EA', '봉',     20,  4000, '다온베이커리포장'),
('A', '베이글',        'INGREDIENT', '베이커리',     'EA', '봉',     10,  8000, '다온베이커리포장'),
('A', '크림치즈',      'INGREDIENT', '유제품',       'G',  '통',   1000, 18000, '다온베이커리포장'),
('A', '치즈케이크',    'INGREDIENT', '디저트완제품', 'EA', '박스',   12, 30000, '다온베이커리포장'),
('A', '초코쿠키',      'INGREDIENT', '디저트완제품', 'EA', '박스',   30, 24000, '다온베이커리포장'),
('A', '일회용컵',      'PACKAGING',  '포장재',       'EA', '박스', 1000, 80000, '다온베이커리포장'),
('A', '컵뚜껑',        'PACKAGING',  '포장재',       'EA', '박스', 1000, 30000, '다온베이커리포장'),
-- B 공강커피: 대용량 · 토스트
('B', '원두',          'INGREDIENT', '커피',         'G',  '봉',   1000, 22000, '한빛커피유통'),
('B', '우유',          'INGREDIENT', '유제품',       'ML', '팩',   1000,  2500, '한빛커피유통'),
('B', '아이스티파우더','INGREDIENT', '음료',         'G',  '봉',   1000, 12000, '한빛커피유통'),
('B', '식빵',          'INGREDIENT', '베이커리',     'EA', '봉',     20,  4000, '다온베이커리포장'),
('B', '햄',            'INGREDIENT', '육가공',       'EA', '팩',     50, 15000, '다온베이커리포장'),
('B', '슬라이스치즈',  'INGREDIENT', '유제품',       'EA', '팩',    100, 20000, '다온베이커리포장'),
('B', '계란',          'INGREDIENT', '신선',         'EA', '판',     30,  9000, '다온베이커리포장'),
('B', '버터',          'INGREDIENT', '유제품',       'G',  '개',    450,  9000, '다온베이커리포장'),
('B', '크로플생지',    'INGREDIENT', '베이커리',     'EA', '박스',   50, 30000, '다온베이커리포장'),
('B', '초코쿠키',      'INGREDIENT', '디저트완제품', 'EA', '박스',   30, 21000, '다온베이커리포장'),
('B', '일회용컵',      'PACKAGING',  '포장재',       'EA', '박스', 1000, 80000, '다온베이커리포장'),
('B', '컵뚜껑',        'PACKAGING',  '포장재',       'EA', '박스', 1000, 30000, '다온베이커리포장'),
-- C 오후의 디저트: 디저트 위주
('C', '원두',          'INGREDIENT', '커피',         'G',  '봉',   1000, 28000, '한빛커피유통'),
('C', '우유',          'INGREDIENT', '유제품',       'ML', '팩',   1000,  2500, '한빛커피유통'),
('C', '딸기청',        'INGREDIENT', '음료',         'G',  '통',   1000, 15000, '한빛커피유통'),
('C', '휘핑크림',      'INGREDIENT', '유제품',       'G',  '팩',   1000,  8000, '한빛커피유통'),
('C', '소금빵생지',    'INGREDIENT', '베이커리',     'EA', '박스',   40, 32000, '다온베이커리포장'),
('C', '크로플생지',    'INGREDIENT', '베이커리',     'EA', '박스',   50, 30000, '다온베이커리포장'),
('C', '티라미수',      'INGREDIENT', '디저트완제품', 'EA', '박스',   10, 32000, '다온베이커리포장'),
('C', '당근케이크',    'INGREDIENT', '디저트완제품', 'EA', '박스',   10, 30000, '다온베이커리포장'),
('C', '마카롱',        'INGREDIENT', '디저트완제품', 'EA', '박스',   50, 60000, '다온베이커리포장'),
('C', '일회용컵',      'PACKAGING',  '포장재',       'EA', '박스', 1000, 80000, '다온베이커리포장'),
('C', '컵뚜껑',        'PACKAGING',  '포장재',       'EA', '박스', 1000, 30000, '다온베이커리포장'),
('C', '디저트포장박스','PACKAGING',  '포장재',       'EA', '묶음',  200, 30000, '다온베이커리포장');

INSERT INTO item (store_id, name, item_type, category, unit, purchase_unit, pack_size, unit_cost,
                  default_supplier_id, is_active, reorder_point, target_qty, policy_basis, purchase_config,
                  created_at, updated_at)
SELECT d.store_id, x.name, x.item_type, x.category, x.unit, x.purchase_unit, x.pack_size,
       round(x.pack_price * CASE WHEN x.name IN ('원두', '우유') THEN 1.08 ELSE 1 END / x.pack_size, 4),   -- 최신 단가 캐시
       sp.supplier_id, true, NULL, NULL, NULL,                                  -- 발주 기준은 60_inventory 에서
       CASE x.name
         WHEN '우유' THEN jsonb_build_object(
           'productName', '우유 1L', 'productRef', 'SKU-MILK-1L',
           'maxUnitCost', round(x.pack_price * 1.08 * 1.15 / x.pack_size, 4), 'allowedPriceIncreaseRate', 0.10,
           'compareBy', 'UNIT_COST',
           'substitute', jsonb_build_object('storage', 'REFRIGERATED', 'packSizeMl', jsonb_build_array(900, 1000)))
         WHEN '원두' THEN jsonb_build_object(
           'productName', '하우스블렌드 원두 1kg', 'productRef', 'SKU-BEAN-1KG',
           'maxUnitCost', round(x.pack_price * 1.08 * 1.15 / x.pack_size, 4), 'allowedPriceIncreaseRate', 0.10,
           'compareBy', 'UNIT_COST', 'substitute', jsonb_build_object('allowed', false))
       END,
       current_date - 1096, now()
FROM demo_item x
JOIN demo_s d    ON d.code = x.code
JOIN supplier sp ON sp.store_id = d.store_id AND sp.name = x.supplier_name;

INSERT INTO item_cost (store_id, item_id, unit_cost, effective_from, source, ref_id, created_at)
SELECT it.store_id, it.item_id, round(x.pack_price / x.pack_size, 4), current_date - 1096, 'SUPPLIER_PRICE', NULL::bigint, current_date - 1096
FROM demo_item x JOIN demo_s d ON d.code = x.code JOIN item it ON it.store_id = d.store_id AND it.name = x.name
UNION ALL
SELECT it.store_id, it.item_id, round(x.pack_price * 1.08 / x.pack_size, 4), current_date - 500, 'SUPPLIER_PRICE', NULL, current_date - 500
FROM demo_item x JOIN demo_s d ON d.code = x.code JOIN item it ON it.store_id = d.store_id AND it.name = x.name
WHERE x.name IN ('원두', '우유');
