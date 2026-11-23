# features — 담당 영역별 화면 폴더

백엔드 패키지(`backend/src/main/java/com/nansogong/<이름>`)와 같은 이름으로 나눈다. 각자 자기 폴더 안에서만 작업하면 PR 충돌이 거의 없다.

| 폴더 | 담당 | 유저 플로우 |
|---|---|---|
| `auth/` | 소정 | UF-01, UF-02 |
| `store/` | 소정 | UF-01, UF-02 |
| `integration/` | 소정 | UF-03, UF-04 |
| `weather/` | 소정 | UF-02, UF-05 |
| `home/` | 예원 | UF-05, UF-06 |
| `coupon/` | 예원 | UF-07, UF-08 |
| `inventory/` | 후상 | UF-09, UF-10, UF-11 |
| `purchase/` | 후상 | UF-12, UF-13, UF-14 |
| `menu/` | 경모 | UF-15, UF-16 |
| `sales/` | 준표 | UF-17, UF-18 |
| `agent/` | 미정(공통) | UF-06, UF-19, UF-20 |

폴더 안 구성 (예시)

```
features/inventory/
├── api.js          # 이 영역의 서버 호출 (src/api/client.js 의 request 사용)
├── queries.js      # TanStack Query 훅 (useInventoryList 등)
├── components/     # 이 영역에서만 쓰는 컴포넌트
└── pages/          # 화면 단위 컴포넌트
```

- 여러 영역이 함께 쓰는 UI 는 `src/components/ui/` (shadcn/ui) 에 둔다
- 서버 데이터는 TanStack Query, 로그인 · 선택한 매장 같은 화면 공통 상태만 Zustand(`src/store/`)
