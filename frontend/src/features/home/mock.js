// 화면 확인용 목업 데이터 — Figma 'v1 디자인 (우리은행)' 예시 값
// 백엔드 API가 생기면 queries.js 에서 api.js 호출로 바꾸고 이 파일은 지운다

export const home = {
  sales: { amount: 482000, orders: 63, diff: '지난주보다 8.2% ↑' },
  forecast: [
    { d: '오늘', w: 'sun', t: '8°' },
    { d: '금', w: 'rain', t: '6°' },
    { d: '토', w: 'cloud', t: '5°' },
    { d: '일', w: 'sun', t: '7°' },
    { d: '월', w: 'rain', t: '4°' },
  ],
  approvals: [
    { title: '발주 승인', value: '145,800원', to: '/orders/recommendation' },
    { title: '오늘 도착한 입고 확인', value: '3개 품목', to: '/receiving' },
    { title: '프로모션 승인', value: '1건', to: '/promotions/latte-set' },
  ],
  results: [
    { title: '우유 10개 발주 전송', value: '성공', to: '/results' },
    { title: '컵 500개 발주', value: '부분 성공', to: '/results' },
    { title: '라떼 세트 POS 반영', value: '반영 완료', to: '/promotions/latte-set/result' },
  ],
  calendar: [
    { d: '19', w: 'sun', t: '입고' },
    { d: '20', w: 'rain', t: '프로모션 예정' },
    { d: '21', w: 'cloud', t: ' ' },
    { d: '22', w: 'sun', t: '성수 축제' },
    { d: '23', w: 'rain', t: ' ' },
  ],
}

// 홈 원본 응답은 유지한다. 아래는 아직 API가 없는 알림·월별 일정의 화면용 목업이다.
// 알림/일정 API 계약이 정해지면 api/home.js만 실제 request() 호출로 교체한다.
export const homeNotifications = [
  {
    id: 'milk-shortage', severity: 'urgent', read: false,
    title: '우유가 내일 오전에 부족해요',
    description: '예상 소진까지 1.2일. 우유 12개 발주가 필요해요.',
    createdAt: '2026-11-24T09:20:00+09:00', to: '/orders/recommendation',
  },
  {
    id: 'vanilla-expiry', severity: 'warning', read: false,
    title: '바닐라 시럽 소비기한이 3일 남았어요',
    description: '먼저 입고된 시럽부터 사용하고 남은 수량을 확인해 주세요.',
    createdAt: '2026-11-24T09:10:00+09:00', to: '/inventory/items/vanilla',
  },
  {
    id: 'latte-promotion', severity: 'normal', read: false,
    title: '비 오는 오후, 라떼 세트 프로모션을 추천해요',
    description: '오후 방문을 늘릴 수 있는 프로모션 조건을 확인해 보세요.',
    createdAt: '2026-11-24T09:30:00+09:00', to: '/promotions/latte-set',
  },
]

export const homeEvents = [
  {
    id: 'milk-delivery-19', type: 'delivery', title: '우유 입고',
    startDate: '2026-11-19', endDate: '2026-11-19', description: '식재료 입고 예정',
  },
  {
    id: 'latte-promotion-period', type: 'promotion', title: '라떼 세트 프로모션',
    startDate: '2026-11-20', endDate: '2026-11-24', description: '진행 중인 프로모션 1건',
  },
  {
    id: 'seongsu-festival', type: 'event', title: '성수 거리 축제',
    startDate: '2026-11-22', endDate: '2026-11-23', description: '예상 수요 증가 +30%',
  },
  {
    id: 'store-stock-check', type: 'custom', title: '주간 재고 점검',
    startDate: '2026-11-24', endDate: '2026-11-24', description: '사장님 등록 일정 · 실제 재고 확인',
  },
  {
    id: 'milk-delivery-25', type: 'delivery', title: '우유 10개 입고 예정',
    startDate: '2026-11-25', endDate: '2026-11-25', description: '배송 도착 후 입고 수량을 확인해 주세요.',
  },
]
