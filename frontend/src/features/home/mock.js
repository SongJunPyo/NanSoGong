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
