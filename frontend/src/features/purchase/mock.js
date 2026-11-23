// 화면 확인용 목업 데이터 — Figma 'v1 디자인 (우리은행)' 예시 값
// 백엔드 API가 생기면 queries.js 에서 api.js 호출로 바꾸고 이 파일은 지운다

export const orderRecommendation = {
  items: [
    { name: '우유 1L × 12', sub: '○○유통 · 11.20 도착', price: '33,600원' },
    { name: '원두 1kg × 2', sub: '△△로스터리 · 11.21 도착', price: '58,000원' },
    { name: '컵 16oz × 500', sub: '□□포장 · 11.22 도착', price: '51,200원' },
  ],
  subtotal: '142,800원',
  shipping: '3,000원',
  total: '145,800원',
}

export const orders = [
  { id: 'o1', title: '우유 1L × 10', sub: '11.19 · ○○유통', status: '배송 중', tone: 'blue', to: '/orders/o1' },
  {
    id: 'o2',
    title: '원두 1kg × 2',
    sub: '11.19 · △△로스터리',
    status: '재승인 필요',
    tone: 'amber',
    to: '/reapproval/o2',
  },
  {
    id: 'o3',
    title: '컵 16oz × 500',
    sub: '11.19 · □□포장 (직접 주문)',
    status: '주문 등록 필요',
    tone: 'warn',
    to: '/orders/o1/direct',
  },
  { id: 'o4', title: '휘낭시에 생지 × 40', sub: '11.17 · ○○유통', status: '부분 입고', tone: 'blue', to: '/orders/o1' },
]
