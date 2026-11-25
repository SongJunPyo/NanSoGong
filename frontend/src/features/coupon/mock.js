// 화면 확인용 목업 데이터 — Figma 'v1 디자인 (우리은행)' 예시 값
// 백엔드 API가 생기면 queries.js 에서 api.js 호출로 바꾸고 이 파일은 지운다

export const promotion = {
  id: 'latte-set',
  title: '비 오는 오후,\n라떼와 휘낭시에',
  menu: '바닐라 라떼 + 휘낭시에',
  benefit: '세트 1,000원 할인',
  price: '8,000원 → 7,000원',
  time: '평일 14:00–17:00',
  period: '11.20–11.26',
  limit: '30장 · 1인 1회',
  maxDiscount: '30,000원',
  margin: '54%',
}

// 44 프로모션 성과 — 진행 중 · 종료 목록 (화면 확인용 예시 값)
//   status   : running(진행 중) | ended(종료)
//   eventId  : 홈 운영 캘린더 일정 id (운영을 종료하면 캘린더 기간도 종료일까지로 줄인다)
//   endedBy  : period(기간 만료) | owner(사장님이 종료)
export const promotions = [
  {
    id: 'latte-set', name: '비 오는 오후 라떼 세트', status: 'running', eventId: 'latte-promotion-period',
    approvedAt: '11.19', startDate: '2026-11-20', endDate: '2026-11-26',
    used: 12, limit: 30, discount: 12000, sales: 84000, lastSync: '11.20 18:00 · 취소 1건 반영',
  },
  {
    id: 'morning-americano', name: '주말 아침 아메리카노', status: 'ended', endedBy: 'period',
    approvedAt: '11.07', startDate: '2026-11-08', endDate: '2026-11-16',
    used: 41, limit: 50, discount: 20500, sales: 184500, lastSync: '11.16 21:00',
  },
  {
    id: 'financier-1plus1', name: '휘낭시에 1+1', status: 'ended', endedBy: 'owner',
    approvedAt: '10.28', startDate: '2026-10-29', endDate: '2026-11-02',
    used: 18, limit: 40, discount: 54000, sales: 108000, lastSync: '11.02 21:00',
  },
]
