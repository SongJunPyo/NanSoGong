-- 📦 재고: 판매 차감(SALE) · 취소 환원(CANCEL) → 매주 발주 · 입고(RECEIPT) · 폐기(DISPOSAL) · 13주마다 실사
--   사용량 = Σ(기본 레시피 + 옵션 레시피 × qty) × quantity (계약 규칙 6). 취소는 CANCEL 행 추가 (규칙 8)
--   중복 방지 키: SALE:{salesOrderItemId} · CANCEL:{salesOrderItemId}:{누적취소수량} (규칙 9, item_id 와 묶어서 UQ)
--   발주량 = 그 주 사용량 × 1.4 − 현재 재고 (구매 단위로 올림) → 3년 동안 음수 · 무한 증가 없이 유지
--   재고 = 마지막 실사 counted_qty + 그 뒤 변동 합. 실사 estimated_qty 는 정확히 이 값
--   발주 결제(payment_status)는 PENDING 으로 넣고 70_bank_expense 가 대금 출금과 맞춰 PAID 로 바꾼다
SET TIME ZONE 'Asia/Seoul';
SELECT setseed(0.20261125);

CREATE TEMP TABLE demo_s AS
SELECT v.code, s.store_id FROM (VALUES ('A', 'demo-office'), ('B', 'demo-campus'), ('C', 'demo-home')) AS v(code, login_id)
JOIN member m ON m.login_id = v.login_id JOIN store s ON s.member_id = m.member_id;

CREATE TEMP TABLE demo_cost_period AS
SELECT ic.item_id, ic.unit_cost, ic.effective_from AS valid_from,
       COALESCE(lead(ic.effective_from) OVER (PARTITION BY ic.item_id ORDER BY ic.effective_from), 'infinity'::timestamptz) AS valid_to
FROM item_cost ic WHERE ic.store_id IN (SELECT store_id FROM demo_s);

-- 1) 판매 차감 (판매 항목 × 재료 1행)
INSERT INTO inventory_transaction (store_id, item_id, txn_type, qty_delta, unit_cost, sales_order_item_id, receipt_item_id,
                                   reversed_inventory_transaction_id, occurred_at, recorded_at, idempotency_key, memo, created_at)
SELECT u.store_id, u.item_id, 'SALE', -u.qty, cp.unit_cost, u.sales_order_item_id, NULL, NULL,
       u.ordered_at, u.ordered_at + interval '5 minutes', 'SALE:' || u.sales_order_item_id, NULL, u.ordered_at + interval '5 minutes'
FROM (
  SELECT x.store_id, x.sales_order_item_id, x.ordered_at, r.item_id, sum(x.quantity * x.per_item * r.quantity) AS qty
  FROM (
    SELECT i.store_id, i.sales_order_item_id, i.quantity, 1::numeric AS per_item, so.ordered_at, so.order_type, i.menu_id AS recipe_menu_id
    FROM sales_order_item i JOIN sales_order so ON so.sales_order_id = i.sales_order_id
    WHERE i.store_id IN (SELECT store_id FROM demo_s) AND i.deduct_status = 'DONE'
    UNION ALL
    SELECT i.store_id, i.sales_order_item_id, i.quantity, (opt ->> 'qty')::numeric, so.ordered_at, so.order_type, (opt ->> 'menuId')::bigint
    FROM sales_order_item i JOIN sales_order so ON so.sales_order_id = i.sales_order_id
    CROSS JOIN LATERAL jsonb_array_elements(i.options) AS opt
    WHERE i.store_id IN (SELECT store_id FROM demo_s) AND i.deduct_status = 'DONE' AND opt ->> 'menuId' IS NOT NULL
  ) AS x
  JOIN recipe_item r
    ON r.menu_id = x.recipe_menu_id
   AND x.ordered_at >= r.valid_from AND (r.valid_to IS NULL OR x.ordered_at < r.valid_to)
   AND (r.applies_to = 'ALL'
        OR (r.applies_to = 'TAKEOUT_DELIVERY' AND x.order_type IN ('TAKEOUT', 'DELIVERY'))
        OR (r.applies_to = 'DINE_IN'          AND x.order_type = 'DINE_IN'))
  GROUP BY 1, 2, 3, 4
) AS u
JOIN demo_cost_period cp ON cp.item_id = u.item_id AND u.ordered_at >= cp.valid_from AND u.ordered_at < cp.valid_to;

-- 2) 취소 환원 (원래 차감 단가 그대로)
INSERT INTO inventory_transaction (store_id, item_id, txn_type, qty_delta, unit_cost, sales_order_item_id, receipt_item_id,
                                   reversed_inventory_transaction_id, occurred_at, recorded_at, idempotency_key, memo, created_at)
SELECT t.store_id, t.item_id, 'CANCEL', -t.qty_delta, t.unit_cost, t.sales_order_item_id, NULL, t.inventory_transaction_id,
       so.canceled_at, so.canceled_at + interval '5 minutes',
       'CANCEL:' || i.sales_order_item_id || ':' || i.canceled_quantity, '주문 취소', so.canceled_at + interval '5 minutes'
FROM inventory_transaction t
JOIN sales_order_item i ON i.sales_order_item_id = t.sales_order_item_id
JOIN sales_order so     ON so.sales_order_id = i.sales_order_id
WHERE t.txn_type = 'SALE' AND i.canceled_quantity > 0 AND t.store_id IN (SELECT store_id FROM demo_s);

-- 3) 주 단위 계획 (월요일 시작)
CREATE TEMP TABLE demo_param AS
SELECT (current_date - 1095) - (extract(isodow FROM current_date - 1095)::int - 1) AS d0;

CREATE TEMP TABLE demo_week AS
SELECT w AS week_no, (SELECT d0 FROM demo_param) + 7 * w AS week_start
FROM generate_series(0, (current_date - (SELECT d0 FROM demo_param)) / 7) AS w;

CREATE TEMP TABLE demo_cons AS
WITH c AS (
  SELECT t.item_id, (t.occurred_at::date - (SELECT d0 FROM demo_param)) / 7 AS week_no, -sum(t.qty_delta) AS cons
  FROM inventory_transaction t
  WHERE t.txn_type IN ('SALE', 'CANCEL') AND t.store_id IN (SELECT store_id FROM demo_s)
  GROUP BY 1, 2
)
SELECT it.item_id, it.store_id, it.default_supplier_id AS supplier_id, it.pack_size,
       it.category IN ('유제품', '신선', '베이커리', '디저트완제품', '육가공') AS perishable,
       w.week_no, w.week_start, COALESCE(c.cons, 0) AS cons,
       CASE WHEN it.category IN ('유제품', '신선', '베이커리', '디저트완제품', '육가공')
            THEN round(COALESCE(c.cons, 0) * 0.02) ELSE 0 END AS waste,          -- 신선 품목 2% 폐기
       (w.week_no > 0 AND w.week_no % 13 = 0) AS is_count,
       round((0.97 + 0.03 * random())::numeric, 4) AS count_factor
FROM item it CROSS JOIN demo_week w
LEFT JOIN c ON c.item_id = it.item_id AND c.week_no = w.week_no
WHERE it.store_id IN (SELECT store_id FROM demo_s);

CREATE TEMP TABLE demo_init AS           -- 초기 재고 = 처음 4주 평균 사용량 × 1.5
SELECT item_id, greatest(ceil(avg(cons) * 1.5), max(pack_size)) AS init_stock
FROM demo_cons WHERE week_no BETWEEN 1 AND 4 GROUP BY 1;

CREATE TEMP TABLE demo_plan AS
WITH RECURSIVE r(item_id, week_no, stock_start) AS (
  SELECT i.item_id, 0, i.init_stock::numeric FROM demo_init i
  UNION ALL
  SELECT r.item_id, r.week_no + 1,
         (CASE WHEN c.is_count THEN round(r.stock_start * c.count_factor) ELSE r.stock_start END)
         + greatest(0, ceil((c.cons * 1.4 - (CASE WHEN c.is_count THEN round(r.stock_start * c.count_factor) ELSE r.stock_start END)) / c.pack_size)) * c.pack_size
         - c.cons - c.waste
  FROM r JOIN demo_cons c ON c.item_id = r.item_id AND c.week_no = r.week_no
  WHERE r.week_no < (SELECT max(week_no) FROM demo_week)
)
SELECT c.*, r.stock_start, x.after_count,
       greatest(0, ceil((c.cons * 1.4 - x.after_count) / c.pack_size))::int AS packs
FROM r JOIN demo_cons c ON c.item_id = r.item_id AND c.week_no = r.week_no
CROSS JOIN LATERAL (SELECT CASE WHEN c.is_count THEN round(r.stock_start * c.count_factor) ELSE r.stock_start END AS after_count) AS x;

-- 4) 실사 (초기 + 13주마다, 월요일 06:00)
INSERT INTO stock_count (store_id, item_id, count_type, estimated_qty, counted_qty, counted_at, memo, created_at)
SELECT store_id, item_id, 'INITIAL', NULL, stock_start, week_start + time '06:00', '재고 계산 시작', week_start + time '06:00'
FROM demo_plan WHERE week_no = 0
UNION ALL
SELECT store_id, item_id, 'COUNT', stock_start, after_count, week_start + time '06:00',
       CASE WHEN after_count < stock_start THEN '실사 차이 (손실 · 계량 오차)' END, week_start + time '06:00'
FROM demo_plan WHERE is_count;

-- 5) 발주: 매주 월 07:00 주문 → 화 10:00 도착 (아직 안 온 이번 주 발주는 SHIPPING)
CREATE TEMP TABLE demo_po_line AS
SELECT p.store_id, p.supplier_id, p.week_start,
       'po-' || p.store_id || '-' || p.supplier_id || '-' || to_char(p.week_start, 'YYYYMMDD') AS workflow_key,
       (p.week_start + time '07:00')::timestamptz AS ordered_at,
       ((p.week_start + 1) + time '10:00')::timestamptz AS arrive_at,
       p.item_id, p.packs, p.pack_size, p.perishable, it.name, it.purchase_unit,
       round(cp.unit_cost * p.pack_size, 2) AS unit_price
FROM demo_plan p
JOIN item it ON it.item_id = p.item_id
JOIN demo_cost_period cp ON cp.item_id = p.item_id
 AND (p.week_start + time '07:00')::timestamptz >= cp.valid_from AND (p.week_start + time '07:00')::timestamptz < cp.valid_to
WHERE p.packs > 0;

INSERT INTO purchase_order (store_id, supplier_id, order_method, status, subtotal, shipping_fee, total_amount,
                            payment_status, paid_amount, paid_at,
                            ordered_at, expected_arrival, external_order_ref, approval_id, workflow_key, created_at, updated_at)
SELECT l.store_id, l.supplier_id, 'MANUAL',                         -- 최근 8주 API 거래처는 80_agent 가 API 로
       CASE WHEN l.arrive_at < now() THEN 'RECEIVED' ELSE 'SHIPPING' END,
       s.subtotal, CASE WHEN s.subtotal >= 50000 THEN 0 ELSE 3000 END,
       s.subtotal + CASE WHEN s.subtotal >= 50000 THEN 0 ELSE 3000 END,
       'PENDING', NULL, NULL,
       l.ordered_at, l.arrive_at::date, NULL, NULL, l.workflow_key, l.ordered_at, now()
FROM (SELECT DISTINCT store_id, supplier_id, workflow_key, ordered_at, arrive_at FROM demo_po_line) AS l
JOIN (SELECT workflow_key, round(sum(packs * unit_price)) AS subtotal FROM demo_po_line GROUP BY 1) AS s
  ON s.workflow_key = l.workflow_key;

INSERT INTO purchase_order_item (store_id, purchase_order_id, item_id, quantity, units_per_order, unit_price, product_name, product_ref,
                                 product_options, purchase_unit, line_status, closed_at, close_reason, created_at, updated_at)
SELECT po.store_id, po.purchase_order_id, l.item_id, l.packs, l.pack_size, l.unit_price, l.name, 'SKU-' || l.item_id,
       NULL, l.purchase_unit,
       CASE WHEN l.arrive_at < now() THEN 'RECEIVED' ELSE 'ACCEPTED' END, NULL, NULL, l.ordered_at, now()
FROM demo_po_line l JOIN purchase_order po ON po.workflow_key = l.workflow_key;

INSERT INTO receipt_item (store_id, purchase_order_item_id, arrived_qty, arrived_at, expiry_date, normal_qty, damaged_qty, wrong_qty,
                          confirmed_at, idempotency_key, issue_note, created_at)
SELECT poi.store_id, poi.purchase_order_item_id, poi.quantity, l.arrive_at, CASE WHEN l.perishable THEN l.arrive_at::date + 7 END,
       poi.quantity, 0, 0, l.arrive_at + interval '20 minutes', 'RECEIPT:' || poi.purchase_order_item_id, NULL,
       l.arrive_at + interval '20 minutes'
FROM purchase_order_item poi
JOIN purchase_order po ON po.purchase_order_id = poi.purchase_order_id
JOIN demo_po_line l    ON l.workflow_key = po.workflow_key AND l.item_id = poi.item_id
WHERE l.arrive_at < now();

-- 파손 예시 1건: C 마카롱 가장 최근 입고 1박스 → 발주 NEEDS_CHECK
CREATE TEMP TABLE demo_damaged AS
SELECT ri.receipt_item_id, poi.purchase_order_id
FROM receipt_item ri
JOIN purchase_order_item poi ON poi.purchase_order_item_id = ri.purchase_order_item_id
JOIN item it ON it.item_id = poi.item_id
WHERE it.name = '마카롱' AND it.store_id = (SELECT store_id FROM demo_s WHERE code = 'C')
ORDER BY ri.arrived_at DESC LIMIT 1;

UPDATE receipt_item SET normal_qty = arrived_qty - 1, damaged_qty = 1, issue_note = '상자 모서리 파손 1박스, 사진 보관'
WHERE receipt_item_id = (SELECT receipt_item_id FROM demo_damaged);
UPDATE purchase_order SET status = 'NEEDS_CHECK', updated_at = now()
WHERE purchase_order_id = (SELECT purchase_order_id FROM demo_damaged);

-- 6) 입고 · 폐기 장부
INSERT INTO inventory_transaction (store_id, item_id, txn_type, qty_delta, unit_cost, sales_order_item_id, receipt_item_id,
                                   reversed_inventory_transaction_id, occurred_at, recorded_at, idempotency_key, memo, created_at)
SELECT ri.store_id, poi.item_id, 'RECEIPT', ri.normal_qty * poi.units_per_order, round(poi.unit_price / poi.units_per_order, 4), NULL::bigint,
       ri.receipt_item_id, NULL::bigint, ri.arrived_at, ri.confirmed_at, 'RECEIPT:' || ri.receipt_item_id, NULL, ri.confirmed_at
FROM receipt_item ri
JOIN purchase_order_item poi ON poi.purchase_order_item_id = ri.purchase_order_item_id
WHERE ri.store_id IN (SELECT store_id FROM demo_s)
UNION ALL
SELECT c.store_id, c.item_id, 'DISPOSAL', -c.waste, cp.unit_cost, NULL, NULL, NULL,
       (c.week_start + 6) + time '23:30', (c.week_start + 6) + time '23:35',
       'DISPOSAL:' || c.item_id || ':' || c.week_start, '유통기한 경과', (c.week_start + 6) + time '23:35'
FROM demo_cons c
JOIN demo_cost_period cp ON cp.item_id = c.item_id
 AND ((c.week_start + 6) + time '23:30')::timestamptz >= cp.valid_from
 AND ((c.week_start + 6) + time '23:30')::timestamptz <  cp.valid_to
WHERE c.waste > 0 AND c.week_start + 6 < current_date;

-- 7) 품목별 발주 기준 (최근 28일 평균 사용량)
UPDATE item it
SET reorder_point = round(x.daily * (sp.lead_time_days + 1) * 1.2, 3),
    target_qty    = round(x.daily * 7 * 1.4, 3),
    policy_basis  = jsonb_build_object('basis', '최근 28일 평균 사용량', 'dailyUsage', round(x.daily, 3),
                                       'leadTimeDays', sp.lead_time_days, 'calculatedAt', now()::text, 'confirmedByOwner', true),
    updated_at = now()
FROM (SELECT t.item_id, -sum(t.qty_delta) / 28 AS daily FROM inventory_transaction t
      WHERE t.txn_type IN ('SALE', 'CANCEL') AND t.occurred_at >= current_date - 28
        AND t.store_id IN (SELECT store_id FROM demo_s) GROUP BY 1) AS x,
     supplier sp
WHERE it.item_id = x.item_id AND sp.supplier_id = it.default_supplier_id;

ANALYZE inventory_transaction;
