# demo-data — 발표용 데모 데이터

발표 시나리오에 쓸 매장 · 메뉴 · 재고 · 매출 데이터를 **SQL 파일로 남겨 두는 곳**입니다.
prod 를 다시 만들어도(스택 삭제 → 재생성) 명령 한 줄로 같은 데이터를 다시 넣을 수 있습니다.

> 아직 표(엔티티)가 없어서 SQL 파일은 비어 있습니다. 그 표를 만든 백엔드 담당(예원 · 준표)이 Flyway 로 표를 만든 뒤 여기에 데모 데이터를 추가하고, 넣는 흐름(`load.sh`)은 인프라 담당(경모)이 관리합니다.

## 넣기

| 어디에 | 명령 |
|---|---|
| 내 PC · dev EC2 (docker compose) | `bash infra/demo-data/load.sh local` |
| prod | SSM Session Manager 로 prod 서버 EC2 한 대에 접속 → `sudo bash /opt/nansogong/deploy/demo-data/load.sh aws` |

prod 서버에는 CodeDeploy 가 배포할 때마다 이 폴더를 함께 깔아 둡니다 (`.github/workflows/backend.yml`). 그래서 SQL 을 고친 뒤 `main` 에 머지 · 배포해야 prod 에서 새 SQL 을 쓸 수 있습니다.

## 파일 규칙

- 이름: `<두 자리 순서>_<영역>.sql` (예: `10_store.sql`, `20_menu.sql`, `30_inventory.sql`, `40_sales.sql`). **숫자 순서대로** 실행되므로 다른 표를 참조하는 데이터는 뒤 번호로
- 파일 하나가 한 트랜잭션입니다. 중간에 실패하면 그 파일은 통째로 취소되고 멈춥니다
- **여러 번 실행해도 결과가 같게** 씁니다 (리허설 중 다시 넣을 수 있게)
  - 고정 ID 를 쓰고 `INSERT ... ON CONFLICT (id) DO NOTHING`
  - 또는 파일 맨 위에서 데모 매장의 데이터를 지우고 다시 넣기 (`DELETE FROM ... WHERE store_id = 9001`)
- 데모 계정 · 매장은 진짜 데이터와 섞이지 않게 눈에 띄는 고정 ID (예: 매장 `9001`, 사장님 계정 `demo@nansogong.local`)
- 비밀번호는 평문이 아니라 BCrypt 해시로 넣습니다 (서버의 `PasswordEncoder` 로 만든 값)
- 매출은 `generate_series` 로 최근 N주치를 만들면 날짜가 늘 "최근" 으로 유지됩니다

```sql
-- 40_sales.sql 예시 (표 이름 · 컬럼은 실제 엔티티에 맞춘다)
DELETE FROM sales WHERE store_id = 9001;
INSERT INTO sales (store_id, menu_id, sold_at, quantity, amount)
SELECT 9001, m.id, d + time '12:00', 10 + (random() * 20)::int, m.price * 10
FROM generate_series(current_date - 56, current_date - 1, interval '1 day') AS d
CROSS JOIN menu m WHERE m.store_id = 9001;
```

## 🚨 주의

- 데모 데이터는 Flyway(`backend/src/main/resources/db/migration`)에 넣지 않습니다. 넣으면 모든 환경 · 테스트에 데모 데이터가 들어갑니다
- 진짜 개인정보 · 실제 사업자번호를 넣지 않습니다 (목업의 정상 사업자번호를 쓴다: `mock/README.md`)
