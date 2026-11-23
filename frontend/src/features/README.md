# features — 도메인별 화면 폴더

백엔드 패키지(`backend/src/main/java/com/nansogong/<이름>`)와 같은 이름으로 나눈다. 프론트엔드는 2명이 백엔드 짝과 같은 도메인을 맡는다 (소정 ↔ 백엔드 예원, 민성 ↔ 백엔드 준표). 각자 자기 폴더 안에서만 작업하면 PR 충돌이 거의 없다.

| 폴더 | 프론트엔드 | 백엔드 짝 | 유저 플로우 |
|---|---|---|---|
| `auth/` | 소정 | 예원 | UF-01, UF-02 |
| `store/` | 소정 | 예원 | UF-01, UF-02 |
| `integration/` | 소정 | 예원 | UF-03, UF-04 |
| `weather/` | 소정 (홈에 표시) | 예원 | UF-02, UF-05 |
| `home/` | 소정 | 예원 | UF-05, UF-06 |
| `coupon/` | 소정 | 예원 | UF-07, UF-08 |
| `sales/` | 소정 | 예원 | UF-17, UF-18 |
| `menu/` | 민성 | 준표 | UF-15, UF-16 |
| `inventory/` | 민성 | 준표 | UF-09, UF-10, UF-11 |
| `purchase/` | 민성 | 준표 | UF-12, UF-13, UF-14 |
| `agent/` | 민성 (승인 · 실행 이력) | 준표 | UF-06, UF-19, UF-20 |

- 화면 공통 틀(하단 탭 `홈 · 재고 · 메뉴 · 매출`, 레이아웃, 로딩 · 에러 표시, `src/components/ui/`)은 **민성**이 먼저 만들고, 소정은 그 틀 위에 화면을 붙인다
- AI 결과를 보여 주는 화면(레시피 추천 · 운영 제안 등)은 AI 담당(후상)과 응답 모양을 먼저 맞춘다

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
