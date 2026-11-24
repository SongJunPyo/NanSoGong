-- 📅 운영 일정 (판매 패턴과 같은 기간). 다가올 일정(오늘 + 90일)도 넣어 수요 예측에 쓴다
--   A: 휴가철 · 연말 감소 / B: 시험 증가 · 방학 감소 / C: 단지 행사 증가 (행사 API 수집)
--   end_at 은 미포함 = 마지막 날의 다음 날 00:00 (한국 시간)
SET TIME ZONE 'Asia/Seoul';

CREATE TEMP TABLE demo_s AS
SELECT v.code, s.store_id FROM (VALUES ('A', 'demo-office'), ('B', 'demo-campus'), ('C', 'demo-home')) AS v(code, login_id)
JOIN member m ON m.login_id = v.login_id JOIN store s ON s.member_id = m.member_id;

INSERT INTO schedule (store_id, source, external_ref, schedule_type, title, start_at, end_at, is_all_day,
                      location, expected_impact, is_hidden, memo, created_at, updated_at)
SELECT d.store_id, x.source, CASE WHEN x.source = 'EVENT_API' THEN x.ref || '-' || y END,
       x.kind, y || ' ' || x.title, x.start_d, x.end_d + 1, true, x.location, x.impact, false, NULL, now(), now()
FROM generate_series(extract(year FROM current_date)::int - 4, extract(year FROM current_date)::int) AS y
CROSS JOIN LATERAL (VALUES
  ('A', 'MANUAL',    NULL,         'OTHER',       '여름 휴가철',     make_date(y, 7, 27),  make_date(y, 8, 9),         NULL,           'DECREASE'),
  ('A', 'MANUAL',    NULL,         'OTHER',       '연말 단축근무',   make_date(y, 12, 24), make_date(y, 12, 31),       NULL,           'DECREASE'),
  ('B', 'MANUAL',    NULL,         'EXAM',        '1학기 중간고사',  make_date(y, 4, 20),  make_date(y, 4, 26),        NULL,           'INCREASE'),
  ('B', 'MANUAL',    NULL,         'EXAM',        '1학기 기말고사',  make_date(y, 6, 14),  make_date(y, 6, 20),        NULL,           'INCREASE'),
  ('B', 'MANUAL',    NULL,         'VACATION',    '여름방학',        make_date(y, 6, 21),  make_date(y, 8, 31),        NULL,           'DECREASE'),
  ('B', 'MANUAL',    NULL,         'EXAM',        '2학기 중간고사',  make_date(y, 10, 19), make_date(y, 10, 25),       NULL,           'INCREASE'),
  ('B', 'MANUAL',    NULL,         'EXAM',        '2학기 기말고사',  make_date(y, 12, 13), make_date(y, 12, 19),       NULL,           'INCREASE'),
  ('B', 'MANUAL',    NULL,         'VACATION',    '겨울방학',        make_date(y, 12, 20), make_date(y + 1, 3, 1) - 1, NULL,           'DECREASE'),
  ('C', 'EVENT_API', 'EVT-SPRING', 'LOCAL_EVENT', '단지 봄 축제',    make_date(y, 4, 11),  make_date(y, 4, 13),        '단지 중앙광장', 'INCREASE'),
  ('C', 'EVENT_API', 'EVT-AUTUMN', 'LOCAL_EVENT', '단지 가을 장터',  make_date(y, 10, 10), make_date(y, 10, 12),       '단지 중앙광장', 'INCREASE')
) AS x(code, source, ref, kind, title, start_d, end_d, location, impact)
JOIN demo_s d ON d.code = x.code
WHERE x.end_d >= current_date - 1095 AND x.start_d < current_date + 90;
