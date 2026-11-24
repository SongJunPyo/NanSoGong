-- 📈 메뉴별 일 판매량 예측 (지난 28일 + 앞으로 14일)
--   ml/ 의 실제 모델 대신 SQL 로 만든 값: 같은 요일 최근 8~10주 평균(일정 영향을 빼고) × 그날 일정 영향
--   model_version 'demo-seasonal-v1' → 실제 모델 결과는 다른 버전으로 쌓인다
SET TIME ZONE 'Asia/Seoul';

CREATE TEMP TABLE demo_s AS
SELECT v.code, s.store_id FROM (VALUES ('A', 'demo-office'), ('B', 'demo-campus'), ('C', 'demo-home')) AS v(code, login_id)
JOIN member m ON m.login_id = v.login_id JOIN store s ON s.member_id = m.member_id;

CREATE TEMP TABLE demo_daily AS
SELECT i.store_id, i.menu_id, so.business_date, sum(i.quantity) AS qty
FROM sales_order_item i
JOIN sales_order so ON so.sales_order_id = i.sales_order_id
JOIN menu m ON m.menu_id = i.menu_id AND m.menu_type = 'MENU'
WHERE i.store_id IN (SELECT store_id FROM demo_s) AND so.status = 'COMPLETED'
GROUP BY 1, 2, 3;

CREATE TEMP TABLE demo_dayfactor AS       -- 50_sales 와 같은 일정 영향
SELECT d.store_id, current_date + k AS day, COALESCE(sc.factor, 1) AS factor, sc.schedule_id
FROM demo_s d
CROSS JOIN generate_series(-120, 13) AS k
LEFT JOIN LATERAL (
  SELECT x.schedule_id,
         CASE WHEN d.code = 'A' THEN 0.70
              WHEN x.schedule_type = 'EXAM' THEN 1.45
              WHEN x.schedule_type = 'VACATION' THEN 0.50
              WHEN x.schedule_type = 'LOCAL_EVENT' THEN 1.30 ELSE 1 END AS factor
  FROM schedule x
  WHERE x.store_id = d.store_id AND current_date + k >= x.start_at::date AND current_date + k < x.end_at::date
  ORDER BY (x.schedule_type = 'EXAM') DESC LIMIT 1
) AS sc ON true;

INSERT INTO demand_forecast (store_id, menu_id, target_date, predicted_qty, lower_qty, upper_qty, model_version, drivers, created_at)
SELECT t.store_id, t.menu_id, t.target_date,
       round(h.base * tf.factor, 2), round(h.base * tf.factor * 0.8, 2), round(h.base * tf.factor * 1.2, 2),
       'demo-seasonal-v1',
       jsonb_build_object('factors', jsonb_build_object('schedule', round(tf.factor - 1, 2)),
                          'scheduleIds', CASE WHEN tf.schedule_id IS NOT NULL THEN jsonb_build_array(tf.schedule_id) ELSE '[]'::jsonb END),
       LEAST(t.target_date - 1, current_date) + time '05:00'           -- 전날 새벽에 예측한 것으로
FROM (SELECT m.store_id, m.menu_id, current_date + k AS target_date
      FROM menu m CROSS JOIN generate_series(-28, 13) AS k
      WHERE m.store_id IN (SELECT store_id FROM demo_s) AND m.menu_type = 'MENU') AS t
JOIN demo_dayfactor tf ON tf.store_id = t.store_id AND tf.day = t.target_date
CROSS JOIN LATERAL (
  SELECT avg(COALESCE(dd.qty, 0) / f.factor) AS base
  FROM generate_series(1, 10) AS w
  JOIN demo_dayfactor f ON f.store_id = t.store_id AND f.day = t.target_date - 7 * w
  LEFT JOIN demo_daily dd ON dd.menu_id = t.menu_id AND dd.business_date = t.target_date - 7 * w
  WHERE t.target_date - 7 * w < current_date
) AS h;
