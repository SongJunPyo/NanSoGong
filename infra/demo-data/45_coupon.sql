-- 🎟️ 승인된 쿠폰 1개씩 (AI 제안 → 사장님 승인 → POS 등록 성공). 28일 전부터 운영 중
--   한가한 시간대를 채우는 쿠폰: A 평일 오후 · B 평일 늦은 오후 · C 평일 오후 (C 는 주말이 이미 붐빈다)
--   conditions · payload 의 키 모양은 가정 (camelCase). 유형별 계약이 정해지면 맞춘다
SET TIME ZONE 'Asia/Seoul';

CREATE TEMP TABLE demo_coupon AS
SELECT s.store_id, s.member_id, i.integration_id AS pos_integration_id, v.*
FROM (VALUES
  ('A', 'demo-office', '평일 오후 음료 1,000원 할인',   '오후 2~5시 주문이 오전 피크의 1/3 수준',
   '{"menus":"음료 전체","discount":{"type":"AMOUNT","value":1000},"days":["mon","tue","wed","thu","fri"],"hours":["14:00","17:00"],"minOrder":5000,"perOrderLimit":1}'),
  ('B', 'demo-campus', '평일 늦은 오후 1,000원 할인',   '오후 3~6시 공강 손님을 토스트로',
   '{"menus":"전체","discount":{"type":"AMOUNT","value":1000},"days":["mon","tue","wed","thu","fri"],"hours":["15:00","18:00"],"minOrder":5000,"perOrderLimit":1}'),
  ('C', 'demo-home',   '평일 오후 디저트 1,000원 할인', '평일 매출이 주말의 55% 수준',
   '{"menus":"디저트 전체","discount":{"type":"AMOUNT","value":1000},"days":["mon","tue","wed","thu","fri"],"hours":["13:00","17:00"],"minOrder":5000,"perOrderLimit":1}')
) AS v(code, login_id, name, reason, conditions)
JOIN member m ON m.login_id = v.login_id
JOIN store s  ON s.member_id = m.member_id
JOIN integration i ON i.store_id = s.store_id AND i.provider = 'TOSS_PLACE';

INSERT INTO suggestion (store_id, workflow_key, version, parent_suggestion_id, change_source, change_reason,
                        suggestion_type, urgency_level, priority, title, summary, payload, evidence, status,
                        business_date, langsmith_trace_id, added_menu_id, created_at, updated_at)
SELECT c.store_id, 'coupon-' || c.store_id || '-1', 1, NULL, 'AI_GENERATED', NULL,
       'COUPON', 'NORMAL', 2, c.name, c.reason,
       c.conditions::jsonb || jsonb_build_object('validFrom', (current_date - 28)::text, 'validTo', (current_date + 2)::text, 'budget', 300000),
       jsonb_build_object('basis', c.reason, 'expectedEffect', '해당 시간대 주문 +10~15%', 'asOf', (current_date - 31)::text),
       'APPROVED', current_date - 31, NULL, NULL, current_date - 31, now()
FROM demo_coupon c;

INSERT INTO approval (store_id, suggestion_id, decided_by_member_id, decision, reason, approved_scope, decided_at, created_at)
SELECT c.store_id, sg.suggestion_id, c.member_id, 'APPROVED', NULL, sg.payload,
       (current_date - 30) + time '10:00', (current_date - 30) + time '10:00'
FROM demo_coupon c JOIN suggestion sg ON sg.workflow_key = 'coupon-' || c.store_id || '-1' AND sg.version = 1;

INSERT INTO coupon (store_id, approval_id, integration_id, name, conditions, valid_from, valid_to, issue_qty, usage_limit_qty,
                    pos_sync_status, pos_coupon_code, pos_synced_at, workflow_key, created_at, updated_at)
SELECT c.store_id, a.approval_id, c.pos_integration_id, c.name, c.conditions::jsonb,
       current_date - 28, current_date + 2, NULL, 400, 'SYNCED', 'C-' || c.code || '-001',
       (current_date - 30) + time '10:05', 'coupon-' || c.store_id || '-1', (current_date - 30) + time '10:01', now()
FROM demo_coupon c
JOIN suggestion sg ON sg.workflow_key = 'coupon-' || c.store_id || '-1' AND sg.version = 1
JOIN approval a    ON a.suggestion_id = sg.suggestion_id;

INSERT INTO execution (store_id, approval_id, purchase_order_id, coupon_id, operation, idempotency_key, exec_status, scope_check,
                       request_body, external_ref, result_summary, error_msg, langsmith_trace_id, runtime_context,
                       executed_at, last_checked_at, resolved_at, created_at, updated_at)
SELECT cp.store_id, cp.approval_id, NULL, cp.coupon_id, 'COUPON_CREATE', 'COUPON_CREATE:' || cp.workflow_key, 'SUCCEEDED',
       '{"withinScope":true,"checked":["discount","hours","budget"]}'::jsonb,
       cp.conditions, cp.pos_coupon_code, '{"registered":true}'::jsonb, NULL, NULL, NULL,
       (current_date - 30) + time '10:02', (current_date - 30) + time '10:05', NULL, (current_date - 30) + time '10:02', now()
FROM coupon cp WHERE cp.store_id IN (SELECT store_id FROM demo_coupon);
