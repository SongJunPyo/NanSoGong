// 화면 확인용 목업 데이터 — Figma 'v1 디자인 (우리은행)' 예시 값
// 백엔드 API가 생기면 queries.js 에서 api.js 호출로 바꾸고 이 파일은 지운다

/** 11월 일별 매출 (원) — 합계 8,412,000 */
export const salesByDay = {
  1: 423000,
  2: 496000,
  3: 379000,
  4: 442000,
  5: 515000,
  6: 398000,
  7: 461000,
  8: 534000,
  9: 417000,
  10: 480000,
  11: 363000,
  12: 436000,
  13: 509000,
  14: 382000,
  15: 455000,
  16: 528000,
  17: 401000,
  18: 451000,
  19: 342000,
}

/** 입출금 (원) — 금융 거래일 기준 */
export const cashByDay = {
  15: [380000, -120000],
  16: [410000, -50000],
  17: [400000, -30000],
  18: [412000, -1209200],
  19: [200000, 0],
}

export const cashTransactions = [
  { title: '카드 정산 입금', sub: 'BC카드 · 11.16 매출분', amount: 412000 },
  { title: '○○유통 대금', sub: '거래처', amount: -139200 },
  { title: '아르바이트 급여', sub: '인건비', amount: -1020000 },
  { title: '이체 · 김○○', sub: '확인 필요', amount: -50000, check: true },
]

export const costs = [
  { title: '임대료', sub: '금융 연동 · 매월 5일', value: '2,000,000원' },
  { title: '인건비', sub: '금융 연동 · 3건', value: '3,200,000원' },
  { title: '카드 수수료', sub: '직접 입력', value: '180,000원' },
  { title: '공과금', sub: '금융 연동', value: '240,000원' },
]

// 41 매출 — 기간 버튼(일·주·월·연)별 요약 (화면 확인용 예시 값)
//   chart : 막대 값(만 원 단위), chartLabels : 막대 아래 이름, 마지막 막대가 이번 기간
export const salesSummary = {
  day: {
    label: '오늘 매출 (11.19 오후 3시 기준)',
    amount: 342000, orders: 41, avg: 8341, change: '어제보다 24% ↓',
    chart: [12, 25, 48, 62, 41, 33, 52, 18], chartLabels: ['8시', '9시', '10시', '11시', '12시', '13시', '14시', '15시'],
    compareLabel: '비교: 지난주 같은 요일',
    base: '11.19 · 342,000원', compare: '11.12 · 318,000원', diff: '+24,000원',
  },
  week: {
    label: '이번 주 매출 (11.17~11.19)',
    amount: 1194000, orders: 158, avg: 7557, change: '2.4% ↑',
    chart: [312, 298, 335, 341, 318, 362, 351, 290], chartLabels: ['10.1주', '10.2주', '10.3주', '10.4주', '10.5주', '11.1주', '11.2주', '이번 주'],
    compareLabel: '비교: 지난주 같은 기간',
    base: '11.17–11.19 · 1,194,000원', compare: '11.10–11.12 · 1,166,000원', diff: '+28,000원',
  },
  month: {
    label: '11월 매출 (1일~19일)',
    amount: 8412000, orders: 1118, avg: 7524, change: '5.1% ↑',
    chart: [38, 42, 40, 51, 47, 55, 62, 58, 49, 53, 60, 66], chartLabels: null,
    compareLabel: '비교: 10월 같은 기간',
    base: '11.1–11.19 · 8,412,000원', compare: '10.1–10.19 · 8,003,000원', diff: '+409,000원',
  },
  year: {
    label: '2026년 매출 (1월~11.19)',
    amount: 118400000, orders: 15820, avg: 7484, change: '첫해라 비교할 수 없어요',
    chart: [96, 102, 108, 112, 118, 121, 126, 124, 115, 128, 84], chartLabels: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11월'],
    compareLabel: '월별 매출',
    base: '2026.1.1–11.19 · 118,400,000원', compare: '—', diff: '—',
  },
}

// 41-3 메뉴별 판매 — 기간별 인기 · 부진 메뉴 (화면 확인용 예시 값)
export const menuSales = {
  day: {
    top: [['아이스 아메리카노', 31, '+4잔'], ['카페라떼', 18, '+2잔'], ['바닐라 라떼', 12, '+5잔']],
    low: [['시즌 음료', 1, '−3잔'], ['치즈케이크', 2, '−2잔']],
  },
  week: {
    top: [['아이스 아메리카노', 212, '+12잔'], ['카페라떼', 140, '+3잔'], ['바닐라 라떼', 96, '+10잔']],
    low: [['시즌 음료', 12, '−8잔'], ['치즈케이크', 15, '−4잔']],
  },
  month: {
    top: [['아이스 아메리카노', 846, '+41잔'], ['카페라떼', 571, '+18잔'], ['바닐라 라떼', 402, '+37잔']],
    low: [['시즌 음료', 58, '−39잔'], ['치즈케이크', 61, '−12잔']],
  },
}

// 매출 현황 전용 예시 계약. 기존 일별 매출과 월 요약의 합계를 보존한다.
// 시간별 실측 자료가 없어 화면 검증용으로만 배분한다. API 전환 시 이 배분은 제거하고
// 서버가 집계한 한국 영업일별·시간별 POS 매출/주문 건수로 대체해야 한다.
function distribute(total, weights) {
  const sum = weights.reduce((value, weight) => value + weight, 0)
  const exact = weights.map((weight) => total * weight / sum)
  const values = exact.map(Math.floor)
  const remaining = total - values.reduce((value, amount) => value + amount, 0)
  const order = exact.map((value, index) => ({ index, rest: value - values[index] })).toSorted((a, b) => b.rest - a.rest)
  order.slice(0, remaining).forEach(({ index }) => { values[index]++ })
  return values
}

const dailyAmounts = Object.values(salesByDay)
const dailyOrders = distribute(salesSummary.month.orders, dailyAmounts)
const hourWeights = [2, 4, 6, 8, 10, 9, 7, 6, 5, 7, 16, 8, 4, 2]
const dailyRecords = dailyAmounts.map((amount, index) => {
  const day = index + 1
  const weights = hourWeights.map((weight, hour) => weight * (1 + ((day + hour) % 5 - 2) * 0.08))
  const amounts = distribute(amount, weights)
  const orders = distribute(dailyOrders[index], weights)
  return {
    date: `2026-11-${String(day).padStart(2, '0')}`,
    amount,
    orders: dailyOrders[index],
    hours: amounts.map((value, hour) => ({ hour: hour + 8, amount: value, orders: orders[hour] })),
  }
})
const comparisonAmounts = distribute(8003000, dailyAmounts.map((amount, index) => amount * (1 + (index % 3 - 1) * 0.06)))

export const salesAnalytics = {
  defaultRange: { from: '2026-11-01', to: '2026-11-19' },
  availableFrom: '2026-11-01',
  availableTo: '2026-11-19',
  updatedAt: '2026-11-19T21:00:00+09:00',
  days: dailyRecords,
  comparisonDays: comparisonAmounts.map((amount, index) => ({ date: `2026-10-${String(index + 1).padStart(2, '0')}`, amount })),
}

export const costForecast = {
  period: '11월 월말 추정', revenue: 12840000, estimatedCost: 3338400, operatingCost: 5620000,
  reviews: [
    { id: 'labor-1115', title: '11.15 출금 · 김○○', source: '우리은행 · 계좌이체', reason: '인건비인지 확인해 주세요', amount: 850000 },
    { id: 'utility-1110', title: '11.10 출금 · 관리비', source: '우리은행 · 자동이체', reason: '직접 입력한 공과금과 중복일 수 있어요', amount: 120000 },
  ],
}

export const promotionPerformance = [
  {
    id: 'latte-set', name: '비 오는 오후, 라떼와 휘낭시에', status: 'active', approvedAt: '2026-11-19',
    from: '2026-11-20', to: '2026-11-26', used: 12, limit: 30, issued: null, discount: 12000, sales: 84000,
    updatedAt: '11.20 18:00', cancellationCount: 1,
    before: { from: '2026-11-06', to: '2026-11-19', orders: 9, menuSales: 100 },
    after: { from: '2026-11-20', to: '2026-11-20', orders: 14, menuSales: 124 },
    expectedLift: 6,
    history: [
      { id: '2041', date: '11.20 14:32', status: '사용' },
      { id: '2057', date: '11.20 15:10', status: '사용' },
      { id: '2063', date: '11.20 16:05', status: '취소' },
    ],
  },
  {
    id: 'morning-coffee', name: '아침을 여는 아메리카노', status: 'ended', approvedAt: '2026-11-05',
    from: '2026-11-06', to: '2026-11-12', used: 32, limit: 40, issued: 40, discount: 16000, sales: 128000,
    updatedAt: '11.12 21:00', cancellationCount: 0,
    before: { from: '2026-10-23', to: '2026-11-05', orders: 10, menuSales: 100 },
    after: { from: '2026-11-06', to: '2026-11-12', orders: 13, menuSales: 118 },
    expectedLift: 4,
    history: [
      { id: '1870', date: '11.12 08:32', status: '사용' },
      { id: '1882', date: '11.12 09:10', status: '사용' },
    ],
  },
]
