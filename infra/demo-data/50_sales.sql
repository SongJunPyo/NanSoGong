-- 🧾 최근 3년 판매 (실행일 기준 1095일, 한국 시간). setseed 로 매번 같은 난수
--   A 오피스: 평일 140건, 주말 ×0.32, 공휴일 ×0.25, 휴가철 · 연말 ×0.7, 출근 · 점심 피크
--   B 대학가: 105건, EXAM ×1.45 (저녁 ↑), VACATION ×0.5, 주말 ×0.75
--   C 주거지: 평일 70건, 주말 · 공휴일 ×1.8, LOCAL_EVENT ×1.3, 오후 디저트 ↑
--   공통: 3년 동안 ×0.85 → ×1.10, 날마다 ±15%, 취소 1.2%, 카드 78% · 간편결제 17% · 현금 5%
--   계약(AGENTS.md 3-5): 같은 메뉴 · 같은 옵션은 한 줄, amount = (unit_price + option_price) × quantity − discount_amount
SET TIME ZONE 'Asia/Seoul';
SELECT setseed(0.20261124);

CREATE TEMP TABLE demo_s AS
SELECT v.code, s.store_id, i.integration_id AS pos_integration_id
FROM (VALUES ('A', 'demo-office'), ('B', 'demo-campus'), ('C', 'demo-home')) AS v(code, login_id)
JOIN member m ON m.login_id = v.login_id JOIN store s ON s.member_id = m.member_id
JOIN integration i ON i.store_id = s.store_id AND i.provider = 'TOSS_PLACE';

-- 공휴일 (주문 수 계산에만 쓴다. 🚨 대체 · 임시 공휴일은 특일 API 로 확인, 2027년 이후에는 추가)
CREATE TEMP TABLE demo_holiday (d date PRIMARY KEY);
INSERT INTO demo_holiday VALUES
('2023-12-25'),
('2024-01-01'),('2024-02-09'),('2024-02-10'),('2024-02-11'),('2024-02-12'),('2024-03-01'),('2024-04-10'),
('2024-05-05'),('2024-05-06'),('2024-05-15'),('2024-06-06'),('2024-08-15'),('2024-09-16'),('2024-09-17'),
('2024-09-18'),('2024-10-01'),('2024-10-03'),('2024-10-09'),('2024-12-25'),
('2025-01-01'),('2025-01-27'),('2025-01-28'),('2025-01-29'),('2025-01-30'),('2025-03-01'),('2025-03-03'),
('2025-05-05'),('2025-05-06'),('2025-06-03'),('2025-06-06'),('2025-08-15'),('2025-10-03'),('2025-10-05'),
('2025-10-06'),('2025-10-07'),('2025-10-08'),('2025-10-09'),('2025-12-25'),
('2026-01-01'),('2026-02-16'),('2026-02-17'),('2026-02-18'),('2026-03-01'),('2026-03-02'),('2026-05-05'),
('2026-05-24'),('2026-05-25'),('2026-06-03'),('2026-06-06'),('2026-08-15'),('2026-08-17'),('2026-09-24'),
('2026-09-25'),('2026-09-26'),('2026-10-03'),('2026-10-05'),('2026-10-09'),('2026-12-25');

-- 메뉴 인기도 (디저트 / 그 외 묶음 안의 비중)
CREATE TEMP TABLE demo_weight (code text, menu_name text, weight int);
INSERT INTO demo_weight VALUES
('A','아메리카노',40),('A','카페라떼',20),('A','바닐라라떼',10),('A','콜드브루',10),('A','에그샌드위치',12),
('A','크림치즈베이글',8),('A','치즈케이크',6),('A','초코쿠키',4),
('B','아메리카노(L)',40),('B','카페라떼(L)',20),('B','아이스티',12),('B','햄치즈토스트',15),('B','에그토스트',10),
('B','크로플',6),('B','초코쿠키',5),
('C','아메리카노',30),('C','카페라떼',20),('C','딸기라떼',10),('C','소금빵',12),('C','크로플',10),
('C','티라미수',8),('C','당근케이크',6),('C','마카롱',8);

CREATE TEMP TABLE demo_menu_pick AS            -- weight 만큼 반복한 배열 → 무작위 칸 = 가중치 뽑기
SELECT d.store_id, (m.category = '디저트') AS is_dessert, array_agg(m.menu_id) AS menu_ids
FROM demo_weight w JOIN demo_s d ON d.code = w.code
JOIN menu m ON m.store_id = d.store_id AND m.name = w.menu_name AND m.menu_type = 'MENU'
CROSS JOIN LATERAL generate_series(1, w.weight)
GROUP BY 1, 2;

CREATE TEMP TABLE demo_option AS               -- 샷 추가 · 휘핑 추가 (소속 메뉴 주문의 12%)
SELECT o.parent_menu_id AS base_menu_id, o.menu_id AS option_menu_id, o.name, o.price, pm.pos_option_code
FROM menu o JOIN demo_s d ON d.store_id = o.store_id
JOIN pos_menu_mapping pm ON pm.integration_id = d.pos_integration_id AND pm.menu_id = o.menu_id
WHERE o.menu_type = 'OPTION';

-- 매장 × 영업일별 주문 수
CREATE TEMP TABLE demo_day AS
WITH d AS (
  SELECT s.store_id, s.code, s.pos_integration_id, current_date - n AS business_date,
         (1095 - n)::numeric / 1095 AS progress,
         extract(isodow FROM current_date - n)::int >= 6 AS is_weekend,
         EXISTS (SELECT 1 FROM demo_holiday h WHERE h.d = current_date - n) AS is_holiday,
         (SELECT sc.schedule_type FROM schedule sc
           WHERE sc.store_id = s.store_id
             AND current_date - n >= sc.start_at::date AND current_date - n < sc.end_at::date
           ORDER BY (sc.schedule_type = 'EXAM') DESC LIMIT 1) AS sched
  FROM demo_s s CROSS JOIN generate_series(1, 1095) AS n
)
SELECT d.*,
       round(
         CASE d.code
           WHEN 'A' THEN 140 * CASE WHEN d.is_holiday THEN 0.25 WHEN d.is_weekend THEN 0.32 ELSE 1 END
                             * CASE WHEN d.sched IS NOT NULL THEN 0.70 ELSE 1 END
           WHEN 'B' THEN 105 * CASE WHEN d.is_holiday THEN 0.70 WHEN d.is_weekend THEN 0.75 ELSE 1 END
                             * CASE d.sched WHEN 'EXAM' THEN 1.45 WHEN 'VACATION' THEN 0.50 ELSE 1 END
           ELSE           70 * CASE WHEN d.is_weekend OR d.is_holiday THEN 1.80 ELSE 1 END
                             * CASE WHEN d.sched = 'LOCAL_EVENT' THEN 1.30 ELSE 1 END
         END
         * (0.85 + 0.25 * d.progress)
         * (0.85 + 0.30 * random())
       )::int AS order_cnt
FROM d;

-- 주문 (hours 배열: 많이 나오는 시각을 여러 번 = 시간대 비중)
CREATE TEMP TABLE demo_order AS
WITH o AS (
  SELECT dd.store_id, dd.code, dd.pos_integration_id, dd.business_date, (dd.is_weekend OR dd.is_holiday) AS is_off, g.seq,
         CASE
           WHEN dd.code = 'A' AND NOT (dd.is_weekend OR dd.is_holiday)
             THEN '{7,7,8,8,8,8,8,8,9,9,9,9,10,10,11,11,12,12,12,12,12,13,13,13,14,14,15,15,16,17,18,19}'::int[]
           WHEN dd.code = 'A'                       THEN '{10,11,12,12,13,13,14,15,16,17}'::int[]
           WHEN dd.code = 'B' AND dd.sched = 'EXAM' THEN '{9,10,11,12,12,13,14,15,16,17,18,19,19,20,20,20,21,21,21,22,22}'::int[]
           WHEN dd.code = 'B'                       THEN '{9,10,11,11,12,12,12,13,13,14,14,15,15,16,17,18,18,19,19,20,21,22}'::int[]
           ELSE                                          '{10,11,12,12,13,13,14,14,14,15,15,15,15,16,16,16,17,17,18,19,20,21}'::int[]
         END AS hours,
         random() AS r_hour, random() AS r_type, random() AS r_cancel, random() AS r_l1, random() AS r_l2, random() AS r_coupon
  FROM demo_day dd CROSS JOIN LATERAL generate_series(1, dd.order_cnt) AS g(seq)
)
SELECT o.store_id, o.code, o.pos_integration_id, o.business_date, o.is_off, x.h,
       o.code || '-' || to_char(o.business_date, 'YYYYMMDD') || '-' || lpad(o.seq::text, 4, '0') AS external_order_id,
       (o.business_date + make_interval(hours => x.h, mins => floor(random() * 60)::int, secs => floor(random() * 60)::int))::timestamptz AS ordered_at,
       CASE o.code
         WHEN 'A' THEN CASE WHEN o.r_type < 0.70 THEN 'TAKEOUT' ELSE 'DINE_IN' END
         WHEN 'B' THEN CASE WHEN o.r_type < 0.55 THEN 'DINE_IN' WHEN o.r_type < 0.95 THEN 'TAKEOUT' ELSE 'DELIVERY' END
         ELSE          CASE WHEN o.r_type < 0.55 THEN 'DINE_IN' WHEN o.r_type < 0.85 THEN 'TAKEOUT' ELSE 'DELIVERY' END
       END AS order_type,
       o.r_cancel < 0.012 AS canceled,
       1 + (o.r_l1 < 0.40)::int + (o.r_l2 < 0.15)::int AS line_cnt,
       CASE o.code
         WHEN 'A' THEN 0.10
         WHEN 'B' THEN 0.15
         ELSE CASE WHEN x.h BETWEEN 13 AND 17 THEN 0.55 ELSE 0.25 END + CASE WHEN o.is_off THEN 0.05 ELSE 0 END
       END AS dessert_p,
       o.r_coupon
FROM o CROSS JOIN LATERAL (SELECT o.hours[1 + floor(o.r_hour * array_length(o.hours, 1))::int] AS h) AS x;

-- 주문 항목: 메뉴 뽑기 → 옵션 12% → 최근 14일은 3% 가 미연결 신메뉴(M900) → 같은 메뉴 · 옵션은 한 줄로
CREATE TEMP TABLE demo_line AS
WITH l AS (
  SELECT o.store_id, o.pos_integration_id, o.external_order_id, o.business_date, o.canceled, g.raw_line_no,
         random() < o.dessert_p AS is_dessert, random() AS r_menu, random() AS r_qty, random() AS r_opt, random() AS r_new
  FROM demo_order o CROSS JOIN LATERAL generate_series(1, o.line_cnt) AS g(raw_line_no)
), p AS (
  SELECT l.*, m.menu_id AS picked_id, m.name AS picked_name, m.price AS picked_price, pm.pos_menu_code AS picked_code,
         (l.business_date >= current_date - 14 AND NOT l.is_dessert AND l.r_new < 0.03) AS is_new
  FROM l
  JOIN demo_menu_pick pk ON pk.store_id = l.store_id AND pk.is_dessert = l.is_dessert
  JOIN menu m ON m.menu_id = pk.menu_ids[1 + floor(l.r_menu * array_length(pk.menu_ids, 1))::int]
  JOIN pos_menu_mapping pm ON pm.integration_id = l.pos_integration_id AND pm.menu_id = m.menu_id AND pm.pos_option_code = ''
), q AS (
  SELECT p.store_id, p.external_order_id, p.canceled, p.raw_line_no,
         CASE WHEN p.is_new THEN NULL ELSE p.picked_id END                              AS menu_id,
         CASE WHEN p.is_new THEN 'M900' ELSE p.picked_code END                          AS pos_menu_code,
         CASE WHEN p.is_new THEN '겨울 한정 라떼' ELSE p.picked_name END                 AS menu_name,
         CASE WHEN p.is_new THEN 5500 ELSE p.picked_price END                           AS unit_price,
         CASE WHEN p.is_new THEN NULL ELSE op.option_menu_id END                        AS opt_menu_id,
         CASE WHEN p.is_new THEN NULL ELSE op.pos_option_code END                       AS opt_code,
         CASE WHEN p.is_new THEN NULL ELSE op.name END                                  AS opt_name,
         CASE WHEN p.is_new OR op.option_menu_id IS NULL THEN 0 ELSE op.price END       AS option_price,
         CASE WHEN p.r_qty < 0.88 THEN 1 WHEN p.r_qty < 0.97 THEN 2 ELSE 3 END          AS qty
  FROM p LEFT JOIN demo_option op ON op.base_menu_id = p.picked_id AND p.r_opt < 0.12
)
SELECT store_id, external_order_id, canceled, menu_id, pos_menu_code, menu_name, unit_price,
       opt_menu_id, opt_code, opt_name, option_price, sum(qty)::int AS qty,
       row_number() OVER (PARTITION BY external_order_id ORDER BY min(raw_line_no))::int AS line_no
FROM q
GROUP BY store_id, external_order_id, canceled, menu_id, pos_menu_code, menu_name, unit_price,
         opt_menu_id, opt_code, opt_name, option_price;

-- 주문 합계 + 쿠폰 (조건에 맞는 주문의 30% 가 사용, 할인은 1번 줄에)
CREATE TEMP TABLE demo_order_final AS
SELECT o.*, t.subtotal, c.coupon_id, c.pos_coupon_code,
       CASE WHEN c.coupon_id IS NOT NULL THEN 1000 ELSE 0 END AS discount
FROM demo_order o
JOIN (SELECT external_order_id, sum((unit_price + option_price) * qty) AS subtotal FROM demo_line GROUP BY 1) t
  ON t.external_order_id = o.external_order_id
LEFT JOIN coupon c
       ON c.store_id = o.store_id
      AND o.business_date BETWEEN c.valid_from AND c.valid_to
      AND NOT o.is_off AND NOT o.canceled
      AND o.h >= split_part(c.conditions -> 'hours' ->> 0, ':', 1)::int
      AND o.h <  split_part(c.conditions -> 'hours' ->> 1, ':', 1)::int
      AND t.subtotal >= (c.conditions ->> 'minOrder')::numeric
      AND o.r_coupon < 0.30;

-- POS 원본 JSON (mock/mappings/pos.json 의 주문 모양)
CREATE TEMP TABLE demo_payload AS
SELECT l.external_order_id,
       jsonb_agg(jsonb_build_object(
         'posMenuId', l.pos_menu_code, 'qty', l.qty, 'unitPrice', l.unit_price,
         'options', CASE WHEN l.opt_code IS NOT NULL
                         THEN jsonb_build_array(jsonb_build_object('posOptionId', l.opt_code, 'qty', 1))
                         ELSE '[]'::jsonb END) ORDER BY l.line_no) AS items
FROM demo_line l GROUP BY 1;

INSERT INTO sales_order (store_id, integration_id, external_order_id, ordered_at, business_date, order_type,
                         total_amount, discount_amount, status, canceled_at, received_at, refunded_amount,
                         source_updated_at, raw_payload, created_at, updated_at)
SELECT o.store_id, o.pos_integration_id, o.external_order_id, o.ordered_at, o.business_date, o.order_type,
       o.subtotal - o.discount, o.discount,
       CASE WHEN o.canceled THEN 'CANCELED' ELSE 'COMPLETED' END,
       CASE WHEN o.canceled THEN o.ordered_at + interval '10 minutes' END,
       o.ordered_at + interval '1 minute',
       CASE WHEN o.canceled THEN o.subtotal - o.discount ELSE 0 END,
       o.ordered_at,
       jsonb_build_object(
         'posOrderId', o.external_order_id,
         'orderedAt',  to_char(o.ordered_at, 'YYYY-MM-DD"T"HH24:MI:SS') || '+09:00',
         'orderType',  o.order_type,
         'status',     CASE WHEN o.canceled THEN 'CANCELED' ELSE 'PAID' END,
         'items',      pl.items,
         'discounts',  CASE WHEN o.coupon_id IS NOT NULL
                            THEN jsonb_build_array(jsonb_build_object('type', 'COUPON', 'posCouponId', o.pos_coupon_code, 'amount', o.discount))
                            ELSE '[]'::jsonb END,
         'paidAmount', CASE WHEN o.canceled THEN 0 ELSE o.subtotal - o.discount END)
       || CASE WHEN o.canceled
               THEN jsonb_build_object('canceledAt', to_char(o.ordered_at + interval '10 minutes', 'YYYY-MM-DD"T"HH24:MI:SS') || '+09:00')
               ELSE '{}'::jsonb END,
       o.ordered_at + interval '1 minute', now()
FROM demo_order_final o JOIN demo_payload pl ON pl.external_order_id = o.external_order_id;

INSERT INTO sales_order_item (store_id, sales_order_id, line_no, pos_menu_code, menu_id, menu_name, quantity, canceled_quantity,
                              unit_price, option_price, discount_amount, amount, options, refunded_amount,
                              deduct_status, processing_error, created_at, updated_at)
SELECT so.store_id, so.sales_order_id, l.line_no, l.pos_menu_code, l.menu_id, l.menu_name, l.qty,
       CASE WHEN l.canceled THEN l.qty ELSE 0 END,
       l.unit_price, l.option_price,
       x.discount,
       (l.unit_price + l.option_price) * l.qty - x.discount,
       CASE WHEN l.opt_code IS NOT NULL
            THEN jsonb_build_array(jsonb_build_object('code', l.opt_code, 'name', l.opt_name, 'qty', 1,
                                                      'price', l.option_price, 'menuId', l.opt_menu_id))
            ELSE '[]'::jsonb END,
       CASE WHEN l.canceled THEN (l.unit_price + l.option_price) * l.qty - x.discount ELSE 0 END,   -- 항목 누적 환불액
       CASE WHEN l.menu_id IS NULL THEN 'NEEDS_FIX' ELSE 'DONE' END,     -- DONE: 60_inventory 가 재고 장부를 넣는다
       CASE WHEN l.menu_id IS NULL THEN '메뉴 미연결 (POS ' || l.pos_menu_code || ')' END,
       so.received_at, now()
FROM demo_line l
JOIN demo_order_final o ON o.external_order_id = l.external_order_id
JOIN sales_order so     ON so.integration_id = o.pos_integration_id AND so.external_order_id = l.external_order_id
CROSS JOIN LATERAL (SELECT CASE WHEN l.line_no = 1 THEN o.discount ELSE 0 END AS discount) AS x;

INSERT INTO sales_payment (store_id, sales_order_id, external_payment_id, method, card_company, amount, approved_at, status,
                           canceled_at, expected_deposit_date, expected_deposit_amount, bank_transaction_id,
                           match_status, matched_at, created_at, updated_at)
SELECT so.store_id, so.sales_order_id, 'PAY-' || so.external_order_id, p.method,
       CASE WHEN p.method = 'CARD' THEN (ARRAY['신한','KB국민','삼성','현대','롯데','BC','하나','우리'])[1 + floor(p.r_card * 8)::int] END,
       so.total_amount, so.ordered_at,
       CASE WHEN so.status = 'CANCELED' THEN 'CANCELED' ELSE 'APPROVED' END, so.canceled_at,
       CASE WHEN so.status = 'CANCELED' THEN NULL
            WHEN p.method = 'CARD'     THEN so.business_date + 2
            WHEN p.method = 'EASY_PAY' THEN so.business_date + 3 END,
       CASE WHEN so.status = 'CANCELED' THEN NULL
            WHEN p.method = 'CARD'     THEN round(so.total_amount * 0.985)    -- 가맹점 수수료 1.5%
            WHEN p.method = 'EASY_PAY' THEN round(so.total_amount * 0.980) END,
       NULL,                                                                -- 70_bank_expense 가 입금과 연결
       CASE WHEN so.status = 'CANCELED' OR p.method = 'CASH' THEN 'NOT_APPLICABLE' ELSE 'PENDING' END,
       NULL, so.received_at, now()
FROM sales_order so
CROSS JOIN LATERAL (
  SELECT CASE WHEN z.r < 0.78 THEN 'CARD' WHEN z.r < 0.95 THEN 'EASY_PAY' ELSE 'CASH' END AS method, z.r_card
  FROM (SELECT random() + 0 * so.sales_order_id AS r, random() + 0 * so.sales_order_id AS r_card) AS z   -- 주문마다 새 난수
) AS p
WHERE so.store_id IN (SELECT store_id FROM demo_s);

INSERT INTO coupon_redemption (store_id, integration_id, external_event_id, pos_coupon_code, coupon_id, sales_order_id, event_type,
                               discount_amount, order_amount, occurred_at, received_at, original_coupon_redemption_id,
                               created_at, updated_at)
SELECT so.store_id, so.integration_id, 'CPN-' || so.external_order_id, o.pos_coupon_code, o.coupon_id, so.sales_order_id, 'USE',
       o.discount, so.total_amount, so.ordered_at, so.received_at, NULL, so.received_at, now()
FROM demo_order_final o
JOIN sales_order so ON so.integration_id = o.pos_integration_id AND so.external_order_id = o.external_order_id
WHERE o.coupon_id IS NOT NULL;

ANALYZE sales_order; ANALYZE sales_order_item; ANALYZE sales_payment;
