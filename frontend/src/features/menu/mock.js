// 화면 확인용 목업 데이터 — Figma 'v1 디자인 (우리은행)' 예시 값
// 백엔드 API가 생기면 queries.js 에서 api.js 호출로 바꾸고 이 파일은 지운다

export const menus = [
  { id: 'americano', name: '아이스 아메리카노', value: '4,500원' },
  { id: 'latte', name: '카페라떼', value: '5,000원' },
  { id: 'vanilla', name: '바닐라 라떼', value: '5,500원' },
  { id: 'financier', name: '휘낭시에', value: '3,000원' },
  { id: 'cheesecake', name: '치즈케이크', value: '6,500원' },
  { id: 'dalgona', name: '달고나 라떼', value: 'POS 미연결' },
]

// 34 AI 메뉴 추천 — '다시 추천' 으로 넘겨 보는 후보 3개 (화면 확인용 예시 값)
//   interest : 검색 관심도 (네이버 데이터랩 검색어 트렌드, 기간 내 최댓값 = 100 기준 상대값)
//   trend    : 같은 기간 앞뒤 4주 비교 증감
//   cost     : 예상 원가(원), estimated = 단가가 없는 재료가 있어 추정값
export const menuRecommendations = [
  {
    id: 'dalgona',
    name: '달고나 라떼',
    category: '커피',
    price: 6000,
    interest: 82,
    trend: '검색량 38% ↑',
    period: '10.22–11.18',
    ingredients: '기존 2개 + 신규 1개',
    recipe: [
      { name: '원두', amount: '18 g', linked: true },
      { name: '우유', amount: '200 ml', linked: true },
      { name: '달고나', amount: '15 g', linked: false },
    ],
    cost: 1650,
    estimated: true,
  },
  {
    id: 'chestnut',
    name: '밤 라떼',
    category: '논커피',
    price: 5800,
    interest: 74,
    trend: '검색량 21% ↑',
    period: '10.22–11.18',
    ingredients: '기존 1개 + 신규 1개',
    recipe: [
      { name: '우유', amount: '220 ml', linked: true },
      { name: '밤 페이스트', amount: '30 g', linked: false },
    ],
    cost: 1900,
    estimated: true,
  },
  {
    id: 'yuja',
    name: '유자 에이드',
    category: '에이드',
    price: 5500,
    interest: 61,
    trend: '검색량 12% ↑',
    period: '10.22–11.18',
    ingredients: '기존 3개',
    recipe: [
      { name: '유자청', amount: '40 g', linked: true },
      { name: '탄산수', amount: '200 ml', linked: true },
      { name: '얼음', amount: '150 g', linked: true },
    ],
    cost: 1350,
    estimated: false,
  },
]
