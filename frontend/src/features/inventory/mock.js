// 화면 확인용 목업 데이터 — Figma 'v1 디자인 (우리은행)' 예시 값
// 백엔드 API가 생기면 queries.js 에서 api.js 호출로 바꾸고 이 파일은 지운다

// tags : 21 재고 상단 탭 분류 (low = 부족, expiring = 소비기한 임박, check = 실사 필요) — 한 품목이 여러 탭에 들어갈 수 있다
// (가정: 서버가 분류해서 내려준다. 응답 모양은 준표님과 맞출 것)
// 품목 상세 (AGENTS.md 3-5 품목 · 단가 계약)
//   unit      : 관리 단위 G · ML · EA (재고 · 레시피 · 그래프의 기준 단위)
//   packSize  : 구매 1개가 관리 단위로 얼마인지 (우유 1팩 = 1000 ML)
//   packLabel : 구매 단위 이름 (팩 · 봉 · 개) — 화면 표시용 (가정: 백엔드 칸 이름은 준표님과 맞출 것)
//   packPrice : 구매 1개 가격. 관리 단위당 단가(item.unit_cost)는 packPrice ÷ packSize 로 계산
//   safeStock : 적정 재고 (관리 단위)
//   dailyUse  : 하루 평균 사용량 (관리 단위, 가정: 최근 7일 판매 × 레시피로 서버가 계산)
//   draft     : AI 발주안 (개수 · 금액) — 부족 카드 버튼에 미리 보여 준다
//   incoming  : 발주했지만 아직 안 온 수량 · 도착까지 남은 날 (purchase/mock 의 진행 중 발주와 맞출 것)
//   lots      : 입고분 — qty 는 남은 구매 단위 수, amount 는 그 입고분 구매 금액
export const inventory = [
  {
    id: 'milk', name: '우유 1L', value: '추정 4개', tags: ['low'],
    category: '유제품', unit: 'ML', packSize: 1000, packLabel: '팩', packPrice: 2800, safeStock: 8000, dailyUse: 3400,
    draft: { qty: 12, amount: 33600 }, // AI 발주안 중 이 품목 몫 (purchase/mock 의 orderRecommendation 우유 줄과 같은 값)
    lots: [
      { id: 'milk-1124', receivedAt: '2026-11-24', qty: 3, amount: 8400, expiresAt: '2026-12-01' },
      { id: 'milk-1125', receivedAt: '2026-11-25', qty: 1, amount: 2800, expiresAt: '2026-12-02' },
    ],
  },
  {
    id: 'bean', name: '원두 1kg', value: '추정 2kg', tags: ['low'],
    category: '원두', unit: 'G', packSize: 1000, packLabel: '봉', packPrice: 25000, safeStock: 4000, dailyUse: 600,
    lots: [{ id: 'bean-1112', receivedAt: '2026-11-12', qty: 2, amount: 50000, expiresAt: '2027-02-12' }],
  },
  {
    id: 'vanilla', name: '바닐라 시럽', value: 'D-3 임박', tags: ['expiring'],
    category: '시럽 · 소스', unit: 'ML', packSize: 1000, packLabel: '병', packPrice: 12000, safeStock: 1000, dailyUse: 400,
    lots: [{ id: 'vanilla-1001', receivedAt: '2026-10-01', qty: 2, amount: 24000, expiresAt: '2026-11-28' }],
  },
  {
    id: 'cup', name: '컵 16oz', value: '추정 320개', tags: ['check'],
    category: '포장재', unit: 'EA', packSize: 1, packLabel: '개', packPrice: 90, safeStock: 300, dailyUse: 35,
    lots: [{ id: 'cup-1105', receivedAt: '2026-11-05', qty: 320, amount: 28800, expiresAt: null }],
  },
  {
    id: 'lid', name: '뚜껑', value: '추정 290개', tags: [],
    category: '포장재', unit: 'EA', packSize: 1, packLabel: '개', packPrice: 40, safeStock: 200, dailyUse: 35,
    incoming: { qty: 300, arriveDays: 0 }, // 발주 o7 · 오늘 도착 (입고 확인 화면과 같은 값)
    lots: [{ id: 'lid-1105', receivedAt: '2026-11-05', qty: 290, amount: 11600, expiresAt: null }],
  },
  {
    id: 'financier', name: '휘낭시에', value: '추정 18개', tags: [],
    category: '디저트', unit: 'EA', packSize: 1, packLabel: '개', packPrice: 1500, safeStock: 12, dailyUse: 6,
    incoming: { qty: 20, arriveDays: 0 }, // 발주 o4 부분 입고의 나머지 · 오늘 도착
    lots: [{ id: 'financier-1124', receivedAt: '2026-11-24', qty: 18, amount: 27000, expiresAt: '2026-11-29' }],
  },
]

export const ITEM_CATEGORIES = ['유제품', '원두', '시럽 · 소스', '포장재', '디저트', '기타']

// 관리 단위 — DB 값은 G · ML · EA 3개만 (화면에는 g · ml · 개 로 보여 준다)
export const ITEM_UNITS = [
  { value: 'G', label: 'g' },
  { value: 'ML', label: 'ml' },
  { value: 'EA', label: '개' },
]
