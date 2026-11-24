-- 🤖 에이전트 제안 · 승인 · 실행
--   (1) 최근 8주 발주: AI 제안 → 사장님 승인 → (API 거래처면) 전송 성공. 발주 방식은 거래처 order_channel 그대로
--   (2) 홈 화면용 대기 제안: 다음 주 발주(v1 → 사장님 수정 v2), 재고 알림, 신메뉴, 데이터 보완
--   payload · evidence 키 모양은 가정 (camelCase)
SET TIME ZONE 'Asia/Seoul';

CREATE TEMP TABLE demo_s AS
SELECT v.code, s.store_id, s.member_id FROM (VALUES ('A', 'demo-office'), ('B', 'demo-campus'), ('C', 'demo-home')) AS v(code, login_id)
JOIN member m ON m.login_id = v.login_id JOIN store s ON s.member_id = m.member_id;

-- (1) 최근 8주 발주
CREATE TEMP TABLE demo_recent_po AS
SELECT po.purchase_order_id, po.store_id, po.supplier_id, po.workflow_key, po.ordered_at, po.total_amount,
       sp.name AS supplier_name, sp.order_channel, d.member_id
FROM purchase_order po JOIN supplier sp ON sp.supplier_id = po.supplier_id JOIN demo_s d ON d.store_id = po.store_id
WHERE po.ordered_at >= current_date - 56;

INSERT INTO suggestion (store_id, workflow_key, version, parent_suggestion_id, change_source, change_reason,
                        suggestion_type, urgency_level, priority, title, summary, payload, evidence, status,
                        business_date, langsmith_trace_id, added_menu_id, created_at, updated_at)
SELECT po.store_id, po.workflow_key, 1, NULL, 'AI_GENERATED', NULL, 'PURCHASE', 'NORMAL', 1,
       po.supplier_name || ' 주간 발주', '이번 주 예상 사용량과 현재 재고로 계산한 1주일치',
       jsonb_build_object('supplierId', po.supplier_id, 'items', l.items, 'totalAmount', po.total_amount),
       jsonb_build_object('basis', '예상 사용량 × 1.4주 − 현재 재고', 'asOf', (po.ordered_at - interval '1 hour')::text),
       'APPROVED', po.ordered_at::date, NULL, NULL, po.ordered_at - interval '1 hour', now()
FROM demo_recent_po po
CROSS JOIN LATERAL (
  SELECT jsonb_agg(jsonb_build_object('itemId', poi.item_id, 'name', poi.product_name, 'quantity', poi.quantity,
                                      'unit', poi.purchase_unit, 'unitPrice', poi.unit_price) ORDER BY poi.item_id) AS items
  FROM purchase_order_item poi WHERE poi.purchase_order_id = po.purchase_order_id
) AS l;

INSERT INTO approval (store_id, suggestion_id, decided_by_member_id, decision, reason, approved_scope, decided_at, created_at)
SELECT po.store_id, sg.suggestion_id, po.member_id, 'APPROVED', NULL,
       jsonb_build_object('supplierId', po.supplier_id, 'maxAmount', po.total_amount, 'items', sg.payload -> 'items'),
       po.ordered_at - interval '10 minutes', po.ordered_at - interval '10 minutes'
FROM demo_recent_po po JOIN suggestion sg ON sg.workflow_key = po.workflow_key AND sg.version = 1;

UPDATE purchase_order po
SET approval_id = a.approval_id,
    order_method = rp.order_channel,
    external_order_ref = CASE WHEN rp.order_channel = 'API' THEN 'SUP-' || po.purchase_order_id END,
    updated_at = now()
FROM demo_recent_po rp
JOIN suggestion sg ON sg.workflow_key = rp.workflow_key AND sg.version = 1
JOIN approval a    ON a.suggestion_id = sg.suggestion_id
WHERE po.purchase_order_id = rp.purchase_order_id;

INSERT INTO execution (store_id, approval_id, purchase_order_id, coupon_id, operation, idempotency_key, exec_status, scope_check,
                       request_body, external_ref, result_summary, error_msg, langsmith_trace_id, runtime_context,
                       executed_at, last_checked_at, resolved_at, created_at, updated_at)
SELECT po.store_id, po.approval_id, po.purchase_order_id, NULL, 'PURCHASE_ORDER_SEND', 'PURCHASE_ORDER_SEND:' || po.workflow_key, 'SUCCEEDED',
       '{"withinScope":true,"checked":["supplier","items","maxAmount"]}'::jsonb,
       sg.payload, po.external_order_ref,
       jsonb_build_object('accepted', true, 'externalOrderRef', po.external_order_ref),
       NULL, NULL, NULL,
       po.ordered_at, po.ordered_at + interval '5 minutes', NULL, po.ordered_at, now()
FROM purchase_order po
JOIN demo_recent_po rp ON rp.purchase_order_id = po.purchase_order_id
JOIN suggestion sg     ON sg.workflow_key = po.workflow_key AND sg.version = 1
WHERE po.order_method = 'API';

-- (2) 지금 대기 중인 제안. 현재 재고 = 마지막 실사 + 그 뒤 변동
CREATE TEMP TABLE demo_stock AS
SELECT it.item_id, it.store_id, it.name, it.item_type, it.purchase_unit, it.pack_size, it.default_supplier_id,
       lc.counted_qty + COALESCE((SELECT sum(t.qty_delta) FROM inventory_transaction t
                                  WHERE t.item_id = it.item_id AND t.occurred_at > lc.counted_at), 0) AS stock,
       (it.policy_basis ->> 'dailyUsage')::numeric AS daily
FROM item it
CROSS JOIN LATERAL (SELECT sc.counted_qty, sc.counted_at FROM stock_count sc
                    WHERE sc.item_id = it.item_id ORDER BY sc.counted_at DESC LIMIT 1) AS lc
WHERE it.store_id IN (SELECT store_id FROM demo_s);

--   다음 주 월요일 발주 (API 거래처): v1 AI 생성 → v2 사장님이 우유 2팩 줄임
CREATE TEMP TABLE demo_next_po AS
SELECT s.store_id, s.default_supplier_id AS supplier_id,
       'po-' || s.store_id || '-' || s.default_supplier_id || '-'
             || to_char(current_date + (8 - extract(isodow FROM current_date)::int), 'YYYYMMDD') AS workflow_key,
       jsonb_agg(jsonb_build_object('itemId', s.item_id, 'name', s.name, 'unit', s.purchase_unit,
                 'quantity', greatest(1, ceil((s.daily * 7 * 1.4 - s.stock) / s.pack_size))) ORDER BY s.item_id) AS items_v1,
       jsonb_agg(jsonb_build_object('itemId', s.item_id, 'name', s.name, 'unit', s.purchase_unit,
                 'quantity', greatest(1, ceil((s.daily * 7 * 1.4 - s.stock) / s.pack_size)
                                       - CASE WHEN s.name = '우유' THEN 2 ELSE 0 END)) ORDER BY s.item_id) AS items_v2
FROM demo_stock s JOIN supplier sp ON sp.supplier_id = s.default_supplier_id
WHERE sp.order_channel = 'API' AND s.daily > 0
GROUP BY 1, 2, 3;

INSERT INTO suggestion (store_id, workflow_key, version, parent_suggestion_id, change_source, change_reason,
                        suggestion_type, urgency_level, priority, title, summary, payload, evidence, status,
                        business_date, langsmith_trace_id, added_menu_id, created_at, updated_at)
SELECT n.store_id, n.workflow_key, 1, NULL, 'AI_GENERATED', NULL, 'PURCHASE', 'NORMAL', 1,
       '다음 주 원두 · 유제품 발주', '최근 28일 사용량 기준 1.4주치',
       jsonb_build_object('supplierId', n.supplier_id, 'items', n.items_v1),
       jsonb_build_object('basis', '최근 28일 평균 사용량 × 1.4주 − 현재 재고', 'asOf', now()::text),
       'SUPERSEDED', current_date, NULL, NULL, now() - interval '2 hours', now()
FROM demo_next_po n;

INSERT INTO suggestion (store_id, workflow_key, version, parent_suggestion_id, change_source, change_reason,
                        suggestion_type, urgency_level, priority, title, summary, payload, evidence, status,
                        business_date, langsmith_trace_id, added_menu_id, created_at, updated_at)
SELECT n.store_id, n.workflow_key, 2, v1.suggestion_id, 'OWNER_EDITED', '다음 주 우유는 행사 상품을 따로 사서 2팩 줄임',
       'PURCHASE', 'NORMAL', 1, v1.title, v1.summary,
       jsonb_build_object('supplierId', n.supplier_id, 'items', n.items_v2), v1.evidence,
       'PENDING', current_date, NULL, NULL, now() - interval '1 hour', now()
FROM demo_next_po n JOIN suggestion v1 ON v1.workflow_key = n.workflow_key AND v1.version = 1;

--   재고 알림 (남은 일수가 가장 적은 원재료) · 신메뉴 · 데이터 보완
INSERT INTO suggestion (store_id, workflow_key, version, parent_suggestion_id, change_source, change_reason,
                        suggestion_type, urgency_level, priority, title, summary, payload, evidence, status,
                        business_date, langsmith_trace_id, added_menu_id, created_at, updated_at)
SELECT x.store_id, 'stock-alert-' || x.store_id || '-' || current_date, 1, NULL::bigint, 'AI_GENERATED', NULL::varchar,
       'STOCK_ALERT', 'WARNING', 1,
       x.name || ' 재고 ' || round(x.stock / x.daily, 1) || '일치', '다음 입고 전에 떨어질 수 있음',
       jsonb_build_object('itemId', x.item_id, 'stock', round(x.stock, 1), 'dailyUsage', round(x.daily, 1)),
       jsonb_build_object('basis', '마지막 실사 + 이후 변동, 최근 28일 평균 사용량', 'asOf', now()::text),
       'PENDING', current_date, NULL::varchar, NULL::bigint, now(), now()
FROM (SELECT DISTINCT ON (s.store_id) s.* FROM demo_stock s
      WHERE s.daily > 0 AND s.item_type = 'INGREDIENT' ORDER BY s.store_id, s.stock / s.daily) AS x
UNION ALL
SELECT d.store_id, 'menu-' || d.store_id || '-1', 1, NULL, 'AI_GENERATED', NULL, 'MENU', 'NORMAL', 3, v.title, v.summary,
       v.payload::jsonb, v.evidence::jsonb, 'PENDING', current_date, NULL, NULL, now(), now()
FROM (VALUES
  ('A', '아침 세트 (아메리카노 + 베이글) 6,500원', '8~9시 주문의 18% 가 커피 + 베이커리 조합',
   '{"name":"아침 세트","price":6500,"componentNames":["아메리카노","크림치즈베이글"],"hours":["07:00","10:00"]}',
   '{"basis":"최근 8주 8~9시 함께 주문된 비율"}'),
  ('B', '시험기간 대용량 아이스 아메리카노 3,500원', '시험 기간 저녁 주문이 평소의 1.6배',
   '{"name":"아이스 아메리카노(XL)","price":3500,"recipeHint":{"원두":24}}',
   '{"basis":"지난 시험 기간 19~22시 주문 수","schedule":"다가오는 2학기 기말고사"}'),
  ('C', '겨울 한정 밤 크로플 6,500원', '크로플이 오후 디저트 판매 1위',
   '{"name":"밤 크로플","price":6500,"baseMenuName":"크로플"}',
   '{"basis":"최근 8주 13~17시 디저트 판매 순위"}')
) AS v(code, title, summary, payload, evidence)
JOIN demo_s d ON d.code = v.code
UNION ALL
SELECT d.store_id, 'data-fix-' || d.store_id || '-M900', 1, NULL, 'AI_GENERATED', NULL, 'DATA_FIX', 'WARNING', 2,
       'POS 새 메뉴 "겨울 한정 라떼" 연결 필요', '연결 전까지 이 메뉴의 재고 차감 · 원가 계산을 하지 못함',
       '{"posMenuCode":"M900","posName":"겨울 한정 라떼"}'::jsonb,
       jsonb_build_object('unmappedSince', (current_date - 14)::text), 'NEEDS_FIX', current_date, NULL, NULL, now(), now()
FROM demo_s d;
