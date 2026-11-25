// 화면 확인용 목업 데이터 — Figma 'v1 디자인 (우리은행)' 예시 값
// 백엔드 API가 생기면 queries.js 에서 api.js 호출로 바꾸고 이 파일은 지운다

export const home = {
  sales: { amount: 482000, orders: 63, diff: '지난주보다 8.2% ↑' },
  // 발주 자금 부족 안내 — 이번 주 발주 예정 금액이 연동 통장 잔액보다 클 때 (없으면 null)
  orderFund: { planned: 145800, balance: 98000 },
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

// AI 운영 브리핑 = 지금 해야 할 일 (중요도순: 긴급 → 주의 → 일반)
//   basis   : AI가 판단에 쓴 근거 (화면에 '근거: …' 로 표시)
//   aiDraft : AI가 미리 만들어 둔 안 — 긴급 배너에 쓴다 (승인은 사장님이 해당 화면에서)
export const homeBriefing = [
  {
    id: 'milk-shortage', severity: 'urgent', read: false,
    title: '우유가 내일 오전에 부족해요',
    description: '예상 소진까지 1.2일. 우유 12개 발주가 필요해요.',
    basis: '최근 7일 사용량 · 기상청 예보',
    createdAt: '2026-11-24T09:20:00+09:00', to: '/orders/recommendation',
    aiDraft: {
      title: 'AI가 우유 발주안을 만들어 뒀어요',
      summary: '내일 오전에 부족해요. 최근 7일 사용량과 내일 비 예보를 보고 12개로 계산했어요.',
      amount: '우유 12개 · 145,800원',
      basisTo: '/orders/recommendation#basis',
    },
  },
  {
    id: 'vanilla-expiry', severity: 'warning', read: false,
    title: '바닐라 시럽 소비기한이 3일 남았어요',
    description: '먼저 입고된 시럽부터 사용하고 남은 수량을 확인해 주세요.',
    basis: '입고일 · 소비기한 기록',
    createdAt: '2026-11-24T09:10:00+09:00', to: '/inventory/items/vanilla',
  },
  {
    id: 'latte-promotion', severity: 'normal', read: false,
    title: '비 오는 오후, 라떼 세트 프로모션을 추천해요',
    description: '오후 방문을 늘릴 수 있는 프로모션 조건을 확인해 보세요.',
    basis: '최근 2주 오후 주문 25% 감소 · 비 예보',
    createdAt: '2026-11-24T09:30:00+09:00', to: '/promotions/latte-set',
  },
]

// 오늘 AI가 한 일 (브리핑 카드 맨 위 요약 줄 · 인사 아래 요약 문장)
export const aiSummary = {
  inventoryChecked: 32, // 점검한 재고 품목 수
  orderDrafts: 1, // 만들어 둔 발주안 수
  priceCompared: 3, // 가격을 비교한 판매처 수
  minutesSaved: 40, // 아낀 시간(분, 추정)
}

// 알림 = 이미 일어난 일의 기록 (시간순, 최근 것이 위). 브리핑의 '할 일'과 겹치지 않게 실행 결과만 둔다
//   result : success(성공) · done(완료) · partial(부분 성공) · check(확인 필요) — 색은 utils/home.js 의 HOME_RESULTS
//   severity: 'urgent' 이고 읽지 않았으면 패널 맨 위에 고정한다
// 알림 API 계약이 정해지면 api/home.js만 실제 request() 호출로 교체한다.
export const homeNotifications = [
  {
    id: 'milk-order-sent', severity: 'normal', result: 'success', read: false,
    title: '우유 10개 발주를 ○○유통에 보냈어요',
    description: '11.20 도착 예정이에요.',
    createdAt: '2026-11-24T15:40:00+09:00', to: '/orders/o1',
  },
  {
    id: 'cup-order-partial', severity: 'warning', result: 'partial', read: false,
    title: '컵 500개 중 300개만 전송됐어요',
    description: '나머지 200개는 쿠팡에서 직접 주문해야 해요.',
    createdAt: '2026-11-24T15:42:00+09:00', to: '/orders/o1',
  },
  {
    id: 'latte-pos-done', severity: 'normal', result: 'done', read: true,
    title: '라떼 세트 프로모션이 POS에 반영됐어요',
    description: '11.20부터 11.26까지 운영해요.',
    createdAt: '2026-11-24T16:03:00+09:00', to: '/promotions/latte-set/result',
  },
  {
    id: 'receiving-check', severity: 'warning', result: 'check', read: false,
    title: '오늘 도착한 입고 3개 품목을 확인해 주세요',
    description: '확인한 수량만 재고에 더해요.',
    createdAt: '2026-11-25T10:05:00+09:00', to: '/receiving',
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
