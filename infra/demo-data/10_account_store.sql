-- 👤 사장님 3명 · 각자의 개인 매장 · 연동 3종 (POS · 거래처 · 금융)
--   A 모닝컵 (오피스) · B 공강커피 (대학가) · C 오후의 디저트 (주거지)
--   id 는 GENERATED ALWAYS 라 직접 넣지 않는다. 데모 데이터는 member.login_id 로 찾는다
--   🚨 password_hash 는 서버 PasswordEncoder(BCrypt) 로 만든 값으로 바꾼다 (평문 금지)
--   이름 · 전화번호 · 사업자번호는 모두 가짜
SET TIME ZONE 'Asia/Seoul';

INSERT INTO member (login_id, password_hash, name, phone, lock_settings, status, phone_verified_at, created_at, updated_at) VALUES
('demo-office', '$2a$10$VMIxto3vn7xKoO7QzvbkbeTRsQTJZANnzdKtgleIj8o2nRe0TxGLG', '김하늘', '010-0000-9001', NULL, 'ACTIVE', current_date - 1100, current_date - 1100, now()),
('demo-campus', '$2a$10$VMIxto3vn7xKoO7QzvbkbeTRsQTJZANnzdKtgleIj8o2nRe0TxGLG', '이도윤', '010-0000-9002', NULL, 'ACTIVE', current_date - 1100, current_date - 1100, now()),
('demo-home',   '$2a$10$VMIxto3vn7xKoO7QzvbkbeTRsQTJZANnzdKtgleIj8o2nRe0TxGLG', '박서아', '010-0000-9003', NULL, 'ACTIVE', current_date - 1100, current_date - 1100, now());

INSERT INTO store (member_id, biz_reg_no, biz_name, owner_name, business_opened_on, verify_status, verified_at,
                   name, category, address, open_hours, closed_days, coupon_settings, onboarding_status, created_at, updated_at)
SELECT m.member_id, v.biz_reg_no, v.name, m.name, current_date - 1200, 'VERIFIED', current_date - 1100,
       v.name, v.category, v.address, v.open_hours::jsonb, '[]'::jsonb, v.coupon_settings::jsonb,
       '{"integration":true,"items":true,"initialStock":true,"recipe":true,"menuMapping":true}'::jsonb,
       current_date - 1100, now()
FROM (VALUES
  ('demo-office', '1000000001', '모닝컵', '카페', '서울특별시 중구 을지로 100',
   '{"mon":["07:00","20:00"],"tue":["07:00","20:00"],"wed":["07:00","20:00"],"thu":["07:00","20:00"],"fri":["07:00","20:00"],"sat":["10:00","18:00"],"sun":["10:00","18:00"]}',
   '{"goal":"한가한 시간대 매출","monthlyBudget":300000,"excludedMenuIds":[],"excludedHours":[],"readjustLimit":1}'),
  ('demo-campus', '1000000002', '공강커피', '카페', '서울특별시 서대문구 연세로 100',
   '{"mon":["09:00","23:00"],"tue":["09:00","23:00"],"wed":["09:00","23:00"],"thu":["09:00","23:00"],"fri":["09:00","23:00"],"sat":["09:00","23:00"],"sun":["09:00","23:00"]}',
   '{"goal":"한가한 시간대 매출","monthlyBudget":200000,"excludedMenuIds":[],"excludedHours":[],"readjustLimit":1}'),
  ('demo-home', '1000000003', '오후의 디저트', '디저트카페', '서울특별시 노원구 상계로 100',
   '{"mon":["10:00","22:00"],"tue":["10:00","22:00"],"wed":["10:00","22:00"],"thu":["10:00","22:00"],"fri":["10:00","22:00"],"sat":["10:00","22:00"],"sun":["10:00","22:00"]}',
   '{"goal":"평일 매출","monthlyBudget":300000,"excludedMenuIds":[],"excludedHours":[],"readjustLimit":1}')
) AS v(login_id, biz_reg_no, name, category, address, open_hours, coupon_settings)
JOIN member m ON m.login_id = v.login_id;

-- auth_ref 는 가짜 참조값 (인증 원문은 DB 에 넣지 않는다). 오픈뱅킹은 60일 뒤 토큰 만료 → 만료 안내 데모
--   거래처 · 금융의 data_scope 코드와 sync_state 의 status 값은 가정 (스키마에 정해진 값 없음)
INSERT INTO integration (store_id, provider, status, external_store_id, external_user_ref, auth_ref, token_expires_at,
                         data_scope, capabilities, connected_at, disconnected_at, last_synced_at, last_error, sync_state,
                         created_at, updated_at)
SELECT s.store_id, p.provider, 'CONNECTED', 'DEMO-' || p.code || '-' || s.biz_reg_no,
       CASE WHEN p.provider = 'OPEN_BANKING' THEN 'demo-user-' || s.biz_reg_no END,
       'demo-ref-' || p.code || '-' || s.biz_reg_no,
       CASE WHEN p.provider = 'OPEN_BANKING' THEN (current_date + 60)::timestamptz END,
       p.data_scope::jsonb, p.capabilities::jsonb,
       current_date - 1096, NULL, now(), NULL,
       (SELECT jsonb_object_agg(k, jsonb_build_object('completeThrough', (current_date - 1)::text,
                                                      'status', 'SUCCEEDED', 'lastAttemptAt', now()::text))
        FROM jsonb_array_elements_text(p.sync_keys::jsonb) AS k),
       current_date - 1096, now()
FROM store s JOIN member m ON m.member_id = s.member_id
CROSS JOIN (VALUES
  ('TOSS_PLACE',   'POS', '["ORDER","PAYMENT","MENU","OPTION","COUPON_USE"]',
   '{"couponSync":true,"orderSend":false,"correctionSend":false}', '["order","payment","menu","couponUse"]'),
  ('SUPPLIER',     'SUP', '["PRODUCT","PURCHASE_ORDER","SHIPMENT"]',
   '{"couponSync":false,"orderSend":true,"correctionSend":true}',  '["product","purchaseOrder"]'),
  ('OPEN_BANKING', 'FIN', '["ACCOUNT","TRANSACTION"]',
   '{"couponSync":false,"orderSend":false,"correctionSend":false}', '["account","transaction"]')
) AS p(provider, code, data_scope, capabilities, sync_keys)
WHERE m.login_id IN ('demo-office', 'demo-campus', 'demo-home');
