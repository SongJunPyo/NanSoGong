// 화면 확인용 목업 데이터 — Figma 'v1 디자인 (우리은행)' 예시 값
// 백엔드 API가 생기면 queries.js 에서 api.js 호출로 바꾸고 이 파일은 지운다

export const orderRecommendation = {
  // channel: channels.js 의 CHANNELS 키 (partner = 앱에서 바로 전송, coupang = 쿠팡에서 직접 주문)
  items: [
    {
      id: 'milk',
      product: '우유 1L',
      qty: 12,
      unit: '개',
      supplier: '○○유통',
      channel: 'partner',
      arrive: '11.27',
      price: 33600,
    },
    {
      id: 'bean',
      product: '원두 1kg',
      qty: 2,
      unit: '개',
      supplier: '△△로스터리',
      channel: 'partner',
      arrive: '11.28',
      price: 58000,
    },
    {
      id: 'cup',
      product: '테이크아웃 컵 16oz',
      qty: 500,
      unit: '개',
      supplier: '쿠팡',
      channel: 'coupang',
      searchQuery: '테이크아웃 컵 16oz 500개',
      arrive: '11.27',
      price: 51200,
    },
  ],
  subtotal: '142,800원',
  shipping: '3,000원',
  total: '145,800원',
}

// 24-1 가격 비교 — 서버 GET /api/stores/{storeId}/purchase/price-compare?itemId=cup 응답 모양 (API 정리 문서 참고)
//   source : coupang | naver | partner (channels.js 의 CHANNELS 키)
//   total  : 필요 수량을 채우는 총비용 (가격 + 배송비), unitPrice : 개당가
//   arriveDays : '빠른 도착' 정렬용 (며칠 뒤 도착)
// 🚨 아래 가격은 화면 확인용 예시 값이에요 (실제 조회 값 아님)
export const priceCompare = {
  cup: {
    itemId: 'cup',
    product: '테이크아웃 컵 16oz',
    needQty: 500,
    checkedAt: '11.23 09:00',
    best: 'coupang-1',
    offers: [
      {
        id: 'coupang-1',
        source: 'coupang',
        seller: '쿠팡',
        title: '테이크아웃 컵 16oz 500개',
        price: 51200,
        shipping: 0,
        shippingNote: '무료 (로켓배송)',
        packQty: 500,
        unitPrice: 102,
        total: 51200,
        arrive: '내일 (11.24)',
        arriveDays: 1,
        url: null, // 실제로는 쿠팡 파트너스 API 의 productUrl
      },
      {
        id: 'naver-1',
        source: 'naver',
        seller: '스마트스토어 OO패키지',
        title: '16oz 종이컵 1,000개',
        price: 99000,
        shipping: 3000,
        packQty: 1000,
        unitPrice: 102,
        total: 102000,
        arrive: '2~3일',
        arriveDays: 3,
        note: '필요 수량의 2배라 총비용이 커요',
        url: null, // 실제로는 네이버 쇼핑 검색 API 의 link
      },
      {
        id: 'partner-1',
        source: 'partner',
        seller: '□□포장',
        title: '컵 16oz 500개',
        price: 58000,
        shipping: 0,
        packQty: 500,
        unitPrice: 116,
        total: 58000,
        arrive: '모레 (11.25)',
        arriveDays: 2,
        url: null,
      },
    ],
  },
}

// 26-0 발주 목록
//   group : 탭 분류 — progress(진행 중) | done(완료) | issue(실패·확인 필요: 사장님이 손써야 함)
export const orders = [
  // 진행 중 발주는 inventory/mock 의 incoming 과 맞춘다 (재고 카드가 '입고 예정'으로 보여 중복 주문을 막는다)
  { id: 'o7', title: '뚜껑 × 300', sub: '11.25 · ○○유통 · 오늘 도착', status: '배송 중', tone: 'blue', to: '/orders/o1', group: 'progress' },
  {
    id: 'o2',
    title: '원두 1kg × 2',
    sub: '11.19 · △△로스터리',
    status: '재승인 필요',
    tone: 'amber',
    to: '/reapproval/o2',
    group: 'issue',
  },
  {
    id: 'o3',
    title: '컵 16oz × 500',
    sub: '11.19 · 쿠팡 (직접 주문)',
    status: '쿠팡 주문 필요',
    tone: 'warn',
    to: '/orders/o1',
    group: 'issue',
  },
  { id: 'o4', title: '휘낭시에 생지 × 40', sub: '11.24 · ○○유통 · 20개 오늘 도착', status: '부분 입고', tone: 'blue', to: '/orders/o1', group: 'progress' },
  { id: 'o1', title: '우유 1L × 10', sub: '11.19 · ○○유통 · 11.20 입고', status: '입고 완료', tone: 'ok', to: '/orders/o1', group: 'done' },
  { id: 'o5', title: '원두 1kg × 2', sub: '11.12 · △△로스터리 · 11.14 입고', status: '입고 완료', tone: 'ok', to: '/orders/o1', group: 'done' },
  { id: 'o6', title: '우유 1L × 12', sub: '11.10 · ○○유통 · 11.11 입고', status: '입고 완료', tone: 'ok', to: '/orders/o1', group: 'done' },
]

// 24-6 ~ 24-10 AI 대신 주문 (UF-13 2C) — 11.23 실제 쿠팡 테스트 화면을 바탕으로 만든 예시
// 실제 서비스에서는 사장님 휴대폰의 에이전트가 쇼핑몰 화면을 조작하고, 단계가 끝날 때마다 서버로 상태를 보낸다
// 🚨 로그인 · 결제 비밀번호 · 카드 정보는 앱 서버로 보내지 않는다 (사장님 기기에만 둔다)
export const agentOrderSettings = {
  malls: [
    { id: 'coupang', name: '쿠팡', sub: '쿠팡비즈 계정 · 휴대폰에서 로그인됨', connected: true },
    { id: 'naver', name: '네이버 쇼핑', sub: '네이버페이 · 스마트스토어', connected: false },
  ],
  alwaysApprove: true,
  autoApproveLimit: 50000, // 켜면 1회 이 금액 이하 · 지정 품목은 승인 알림 없이 결제
  autoApproveOn: false,
  stopRules: [
    '가격이 추천가보다 10% 넘게 올랐을 때',
    '품절이라 다른 상품을 골라야 할 때',
    '최소 주문 금액·배송비 안내가 뜰 때',
    '배송지가 매장 주소와 다를 때',
  ],
}

export const agentOrder = {
  mall: 'coupang',
  query: '우유 1L 12개',
  item: '우유 1L × 12',
  picked: { name: '믈레코비타 멸균우유 1L × 12', price: 15550, discount: 3890 },
  recommendPrice: 15550,
  steps: [
    { id: 'search', label: '쿠팡에서 검색', done: '"우유 1L 12개" · 상품 71개 확인' },
    { id: 'pick', label: '조건에 맞는 최저가 고르기', done: '광고 제외 · 1L × 12개 · 믈레코비타 15,550원' },
    { id: 'cart', label: '장바구니 담기', done: '쿠팡 즉시할인 3,890원 적용' },
    { id: 'sheet', label: '주문서 작성', done: '배송지 ○○카페 (매장) · 로켓배송 내일 도착' },
    { id: 'pay', label: '결제 승인', done: '사장님이 쿠팡 결제 화면에서 결제' },
    { id: 'record', label: '주문번호 확인 · 장부 기록', done: '발주 내역 · 지출 장부에 기록' },
  ],
  // 주문서 작성(3번) 단계에서 쿠팡이 띄운 안내 — 멈춤 조건 '최소 주문 금액'
  stop: {
    atStep: 3,
    title: '로켓배송 최소 금액이\n안 돼서 멈췄어요',
    cart: 15550,
    threshold: 19800,
    short: 4250,
    message: '쿠팡이 "4,250원 이상 추가 시 구매 가능" 안내를 띄웠어요. 어떻게 할까요?',
    suggestions: [
      { id: 'lid', name: '컵 뚜껑 16oz 100개', note: '재고 3일 남음', price: 5900 },
      { id: 'straw', name: '빨대 200개', note: '재고 5일 남음', price: 4600 },
    ],
  },
  shipTo: '○○카페 (매장)',
  arrive: '내일 (11.24)',
}
