# 프론트엔드 규칙

React PWA(`frontend/`) 코드 규칙입니다. JavaScript · JSX를 쓰고 TypeScript는 쓰지 않습니다. 구조의 기준은 [WONIT-A/07_cicd](https://github.com/WONIT-A/07_cicd)의 `frontend/src/` (api · components · hooks · utils) 입니다.

## 폴더 구조

```
frontend/src/
├── App.jsx · AppRouter.jsx · routes.js
├── api/           서버 호출은 여기에만. client.js의 request() 하나 + 도메인별 파일
├── components/
│   ├── ui/        shadcn/ui 부품 (공용)
│   ├── common/    하단 탭바 · 헤더 · 로딩 · 에러 표시
│   └── <도메인>/   XxxPage.jsx …
├── features/      (옮기는 중) 도메인별 화면 · mock.js · queries.js
├── hooks/         useXxx (TanStack Query 훅 포함)
├── store/         Zustand (로그인 · 선택 매장)
├── utils/         format.js (금액 · 날짜)
└── lib/utils.js   shadcn용 (건드리지 않는다)
```

- 지금은 `features/<도메인>/` 과 `components/<도메인>/` 이 함께 있다. 목표는 위의 종류별 구조(`api` · `components` · `hooks`)다. 새 화면을 어디에 둘지 애매하면 같은 도메인의 기존 파일 위치를 따른다.
- 화면 목록과 주소는 `src/routes.js` 의 `ROUTES` 에서 관리한다. 새 화면은 여기에 한 줄을 추가한다.

## 코드 규칙

| 규칙 | 이유 |
|---|---|
| **컴포넌트에서 `fetch` 를 직접 부르지 않는다.** 항상 `api/<도메인>.js` → `request()` | 토큰 · 에러 처리를 한 곳에서만 고치기 위해 |
| 서버 데이터는 TanStack Query. **`queryKey` 에 `storeId` 를 꼭 넣는다** | 매장을 바꿨을 때 다른 매장 데이터가 보이는 사고를 막는다 |
| 로그인 토큰은 메모리(Zustand)에만 둔다. **`localStorage` · `sessionStorage` 에 토큰 저장 금지** | XSS로 토큰이 털리지 않게 |
| 에러는 `err.message` 를 그대로 보여 준다 | 서버 `ErrorResponse.message` 가 사용자용 문구다 |
| **모바일 우선**: 폭 360px에서 먼저 확인한다. 스타일은 Tailwind 클래스, 공통 부품은 shadcn/ui | PWA · 사장님 휴대폰 |
| 금액 · 날짜 표시는 `utils/format.js` 를 쓴다 | `toLocaleString` 을 여기저기 흩뿌리지 않기 위해 |
| 상태 코드(`NEEDS_FIX` 등)의 한글 표시는 프론트에서 바꾼다 | 서버 · DB는 영어 코드만 쓴다 |

- 백엔드 API가 아직 없으면 **합의한 JSON 예시를 return하는 가짜 함수**로 `api/<도메인>.js` 를 먼저 만든다. API가 생기면 `request()` 로 바꾼다.
- shadcn 부품을 추가(`npx shadcn@latest add …`)하면 사용자에게 알리고 PR 설명에 따로 적는다.
- AI 진행 상태(진행 중 · 인증 필요 · 재승인 필요 · 결과 확인 중 · 완료)와 실행기 연결 상태는 서버가 준 상태 코드대로 보여 준다. 화면에서 상태를 추측해 만들지 않는다.
- 정해지지 않은 화면(실행기 연결 · 인증 안내 등)은 목업으로 만들고 범위 밖 기능은 [도메인 규칙](domain.md#현재-범위-밖)을 따른다.

## 확인

- `cd frontend && npm run lint && npm run build`
- 패키지 설치는 `npm ci`. lock 파일을 바꿀 때만 `npm install` 후 lock을 커밋한다.
