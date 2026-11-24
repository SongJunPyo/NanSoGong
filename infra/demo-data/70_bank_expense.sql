-- 🏦 계좌 · 입출금 · 비용 · 발주 결제
--   입금: 카드사 · 간편결제별 하루 정산액 → sales_payment 와 대사 (0.4% 는 3,000원 차이 = AMOUNT_MISMATCH)
--   출금: 거래처 대금(발주 다음 날) · 임대료(5일) · 인건비(10일) · 공과금(25일, 여름 · 겨울 ↑). 시작 잔액 2,000만 원
--   거래처 대금이 나간 발주는 결제 완료(PAID) 로 바꾼다
SET TIME ZONE 'Asia/Seoul';
SELECT setseed(0.20261126);

CREATE TEMP TABLE demo_s AS
SELECT v.code, s.store_id, i.integration_id AS fin_integration_id
FROM (VALUES ('A', 'demo-office'), ('B', 'demo-campus'), ('C', 'demo-home')) AS v(code, login_id)
JOIN member m ON m.login_id = v.login_id JOIN store s ON s.member_id = m.member_id
JOIN integration i ON i.store_id = s.store_id AND i.provider = 'OPEN_BANKING';

INSERT INTO bank_account (store_id, integration_id, institution_name, account_mask, account_ref, alias, account_type,
                          purpose, is_included, is_primary, status, balance, balance_at, connected_at, disconnected_at,
                          created_at, updated_at)
SELECT d.store_id, d.fin_integration_id, '난소공은행', '100-***-' || lpad(d.store_id::text, 4, '0'),
       lpad(d.store_id::text, 24, '0'), '매출 정산 통장', 'DEPOSIT', 'SETTLEMENT', true, true, 'CONNECTED',
       NULL, NULL, current_date - 1096, NULL, current_date - 1096, now()
FROM demo_s d;

CREATE TEMP TABLE demo_month AS
SELECT (make_date(extract(year FROM current_date)::int, extract(month FROM current_date)::int, 1) - make_interval(months => k))::date AS m
FROM generate_series(0, 36) AS k;

CREATE TEMP TABLE demo_bank AS
-- 카드 · 간편결제 정산 입금
SELECT g.store_id,
       (g.dep_date + time '09:00' + make_interval(mins => floor(g.r2 * 120)::int))::timestamptz AS txn_at,
       'IN' AS direction,
       g.amount - CASE WHEN g.is_short THEN 3000 ELSE 0 END AS amount,
       CASE WHEN g.company = '간편결제' THEN '간편결제 정산' ELSE g.company || '카드 매출대금' END AS description,
       'SETTLEMENT' AS category, NULL::bigint AS purchase_order_id,
       'DEP:' || g.store_id || ':' || g.dep_date || ':' || g.company AS ext_key, g.is_short
FROM (SELECT sp.store_id, sp.expected_deposit_date AS dep_date, COALESCE(sp.card_company, '간편결제') AS company,
             sum(sp.expected_deposit_amount) AS amount,
             (random() < 0.004 AND sum(sp.expected_deposit_amount) > 10000) AS is_short, random() AS r2
      FROM sales_payment sp
      WHERE sp.store_id IN (SELECT store_id FROM demo_s) AND sp.expected_deposit_date < current_date
      GROUP BY 1, 2, 3) AS g
UNION ALL
-- 거래처 대금 (발주 다음 날 11:00)
SELECT po.store_id, po.ordered_at + interval '1 day 4 hours', 'OUT', po.total_amount, sp.name, 'SUPPLIER_PAYMENT',
       po.purchase_order_id, 'PO:' || po.purchase_order_id, false
FROM purchase_order po JOIN supplier sp ON sp.supplier_id = po.supplier_id
WHERE po.store_id IN (SELECT store_id FROM demo_s) AND po.ordered_at + interval '1 day 4 hours' < current_date
UNION ALL
-- 임대료 · 인건비 · 공과금
SELECT d.store_id, ((dm.m + (f.pay_day - 1)) + time '10:00')::timestamptz, 'OUT',
       CASE WHEN f.category = 'UTILITY'
            THEN round(f.amount * (0.85 + 0.30 * random()) * CASE WHEN extract(month FROM dm.m) IN (1, 2, 7, 8) THEN 1.25 ELSE 1 END)
            ELSE f.amount END,
       f.description, f.category, NULL, f.category || ':' || d.store_id || ':' || dm.m, false
FROM demo_month dm
CROSS JOIN (VALUES
  ('A', 'RENT', 5, 3500000, '건물 임대료'), ('A', 'PAYROLL', 10, 6000000, '직원 급여'), ('A', 'UTILITY', 25, 450000, '전기 · 수도 · 가스'),
  ('B', 'RENT', 5, 2500000, '건물 임대료'), ('B', 'PAYROLL', 10, 5000000, '직원 급여'), ('B', 'UTILITY', 25, 380000, '전기 · 수도 · 가스'),
  ('C', 'RENT', 5, 2800000, '건물 임대료'), ('C', 'PAYROLL', 10, 4500000, '직원 급여'), ('C', 'UTILITY', 25, 420000, '전기 · 수도 · 가스')
) AS f(code, category, pay_day, amount, description)
JOIN demo_s d ON d.code = f.code
WHERE dm.m + (f.pay_day - 1) >= current_date - 1095 AND dm.m + (f.pay_day - 1) < current_date;

INSERT INTO bank_transaction (store_id, bank_account_id, external_txn_id, txn_at, txn_time_precision, direction, amount, balance_after,
                              description, category, category_source, purchase_order_id, received_at, created_at, updated_at)
SELECT b.store_id, a.bank_account_id, b.ext_key, b.txn_at, 'TIME', b.direction, b.amount,
       20000000 + sum(CASE WHEN b.direction = 'IN' THEN b.amount ELSE -b.amount END)
                  OVER (PARTITION BY b.store_id ORDER BY b.txn_at, b.ext_key),
       b.description, b.category, 'AUTO', b.purchase_order_id, b.txn_at + interval '10 minutes',
       b.txn_at + interval '10 minutes', now()
FROM demo_bank b JOIN bank_account a ON a.store_id = b.store_id;

-- 결제 ↔ 입금 대사
UPDATE sales_payment sp
SET bank_transaction_id = bt.bank_transaction_id,
    match_status = CASE WHEN b.is_short THEN 'AMOUNT_MISMATCH' ELSE 'MATCHED' END,
    matched_at = bt.txn_at + interval '1 hour', updated_at = now()
FROM demo_bank b, bank_transaction bt
WHERE sp.store_id IN (SELECT store_id FROM demo_s)
  AND sp.expected_deposit_date < current_date
  AND b.ext_key = 'DEP:' || sp.store_id || ':' || sp.expected_deposit_date || ':' || COALESCE(sp.card_company, '간편결제')
  AND bt.store_id = sp.store_id AND bt.external_txn_id = b.ext_key;

-- 거래처 대금이 실제로 나간 발주 = 결제 완료 확인 → PAID (금액 · 시각 함께)
UPDATE purchase_order po
SET payment_status = 'PAID', paid_amount = bt.amount, paid_at = bt.txn_at, updated_at = now()
FROM bank_transaction bt
WHERE bt.purchase_order_id = po.purchase_order_id
  AND bt.category = 'SUPPLIER_PAYMENT'
  AND po.store_id IN (SELECT store_id FROM demo_s);

-- 비용: 금융 거래에서 (임대료 · 인건비 · 공과금) + 수동 입력 (POS 월 이용료)
INSERT INTO expense (store_id, category, amount, period_start, period_end, source, bank_transaction_id, allocation,
                     status, memo, created_at, updated_at)
SELECT bt.store_id, bt.category, bt.amount,
       date_trunc('month', bt.txn_at)::date, (date_trunc('month', bt.txn_at) + interval '1 month - 1 day')::date,
       'BANK', bt.bank_transaction_id, 'EVEN', 'APPLIED', NULL, bt.received_at, now()
FROM bank_transaction bt
WHERE bt.store_id IN (SELECT store_id FROM demo_s) AND bt.category IN ('RENT', 'PAYROLL', 'UTILITY')
UNION ALL
SELECT d.store_id, 'FEE', 33000, dm.m, (dm.m + interval '1 month - 1 day')::date, 'MANUAL', NULL, 'EVEN', 'APPLIED',
       'POS 월 이용료', dm.m, now()
FROM demo_s d CROSS JOIN demo_month dm
WHERE dm.m >= current_date - 1095;

UPDATE bank_account a
SET balance = x.balance_after, balance_at = now(), updated_at = now()
FROM (SELECT DISTINCT ON (bank_account_id) bank_account_id, balance_after FROM bank_transaction
      WHERE store_id IN (SELECT store_id FROM demo_s)
      ORDER BY bank_account_id, txn_at DESC, external_txn_id DESC) AS x
WHERE a.bank_account_id = x.bank_account_id;
