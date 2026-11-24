-- 🧹 데모 데이터 지우기 (데모 사장님 login_id 의 매장에 딸린 것 전부). 뒤 파일들이 다시 넣는다
--   모든 업무 표에 store_id 가 있어서 store_id 로 바로 지운다. 참조하는 표부터
--   진짜 데이터는 건드리지 않는다 (데모 사장님 3명의 매장만)
--   ⏱️ FK 칸에 인덱스가 없어서 그냥 지우면 재고 장부 100만 행 × 행마다 FK 검사(표 전체 훑기)로 끝나지 않는다
--      → 이 트랜잭션에서만 FK 검사를 끈다 (SET LOCAL). 데모 매장의 행을 모든 표에서 함께 지우므로 끊어진 참조는 남지 않는다
--      superuser · RDS rds_superuser(마스터 계정) 로 실행해야 한다
SET TIME ZONE 'Asia/Seoul';
SET LOCAL session_replication_role = replica;

CREATE TEMP TABLE demo_store AS
SELECT s.store_id FROM store s JOIN member m ON m.member_id = s.member_id
WHERE m.login_id IN ('demo-office', 'demo-campus', 'demo-home');

DELETE FROM demand_forecast       WHERE store_id IN (SELECT store_id FROM demo_store);
DELETE FROM coupon_redemption     WHERE store_id IN (SELECT store_id FROM demo_store);
DELETE FROM execution             WHERE store_id IN (SELECT store_id FROM demo_store);
DELETE FROM inventory_transaction WHERE store_id IN (SELECT store_id FROM demo_store);
DELETE FROM stock_count           WHERE store_id IN (SELECT store_id FROM demo_store);
DELETE FROM expense               WHERE store_id IN (SELECT store_id FROM demo_store);
DELETE FROM sales_payment         WHERE store_id IN (SELECT store_id FROM demo_store);
DELETE FROM bank_transaction      WHERE store_id IN (SELECT store_id FROM demo_store);
DELETE FROM bank_account          WHERE store_id IN (SELECT store_id FROM demo_store);
DELETE FROM receipt_item          WHERE store_id IN (SELECT store_id FROM demo_store);
DELETE FROM purchase_order_item   WHERE store_id IN (SELECT store_id FROM demo_store);
DELETE FROM purchase_order        WHERE store_id IN (SELECT store_id FROM demo_store);
DELETE FROM coupon                WHERE store_id IN (SELECT store_id FROM demo_store);
DELETE FROM approval              WHERE store_id IN (SELECT store_id FROM demo_store);
DELETE FROM suggestion            WHERE store_id IN (SELECT store_id FROM demo_store);
DELETE FROM sales_order_item      WHERE store_id IN (SELECT store_id FROM demo_store);
DELETE FROM sales_order           WHERE store_id IN (SELECT store_id FROM demo_store);
DELETE FROM pos_menu_mapping      WHERE store_id IN (SELECT store_id FROM demo_store);
DELETE FROM recipe_item           WHERE store_id IN (SELECT store_id FROM demo_store);
DELETE FROM item_cost             WHERE store_id IN (SELECT store_id FROM demo_store);
DELETE FROM item                  WHERE store_id IN (SELECT store_id FROM demo_store);
DELETE FROM supplier              WHERE store_id IN (SELECT store_id FROM demo_store);
DELETE FROM menu                  WHERE store_id IN (SELECT store_id FROM demo_store);
DELETE FROM schedule              WHERE store_id IN (SELECT store_id FROM demo_store);
DELETE FROM integration           WHERE store_id IN (SELECT store_id FROM demo_store);
DELETE FROM store                 WHERE store_id IN (SELECT store_id FROM demo_store);
DELETE FROM member                WHERE login_id IN ('demo-office', 'demo-campus', 'demo-home');
