// 화면 확인용 목업 데이터 — Figma 'v1 디자인 (우리은행)' 예시 값
// 백엔드 API가 생기면 queries.js 에서 api.js 호출로 바꾸고 이 파일은 지운다

// 31 메뉴 목록 — 누르면 아래로 펼쳐지는 정보까지 담는다
//   price · cost : 원(숫자), recipe : 1잔 기준 재료, pos : POS 메뉴 연결 여부
export const menus = [
  {
    id: 'americano', name: '아이스 아메리카노', value: '4,500원', category: '커피', price: 4500, cost: 820, pos: true, onSale: true,
    recipe: [{ name: '원두', amount: '18 g' }, { name: '얼음', amount: '150 g' }, { name: '컵 · 뚜껑', amount: '1 개' }],
  },
  {
    id: 'latte', name: '카페라떼', value: '5,000원', category: '커피', price: 5000, cost: 1200, pos: true, onSale: true,
    recipe: [{ name: '원두', amount: '18 g' }, { name: '우유', amount: '200 ml' }, { name: '컵 · 뚜껑', amount: '1 개' }],
  },
  {
    id: 'vanilla', name: '바닐라 라떼', value: '5,500원', category: '커피', price: 5500, cost: 1450, pos: true, onSale: true,
    recipe: [{ name: '원두', amount: '18 g' }, { name: '우유', amount: '200 ml' }, { name: '바닐라 시럽', amount: '20 ml' }],
  },
  {
    id: 'financier', name: '휘낭시에', value: '3,000원', category: '디저트', price: 3000, cost: 900, pos: true, onSale: true,
    recipe: [{ name: '휘낭시에 생지', amount: '1 개' }],
  },
  {
    id: 'cheesecake', name: '치즈케이크', value: '6,500원', category: '디저트', price: 6500, cost: 2300, pos: true, onSale: true,
    recipe: [{ name: '치즈케이크 (완제품)', amount: '1 조각' }],
  },
  {
    id: 'dalgona', name: '달고나 라떼', value: 'POS 미연결', category: '커피', price: 6000, cost: 1650, pos: false, onSale: true,
    recipe: [{ name: '원두', amount: '18 g' }, { name: '우유', amount: '200 ml' }, { name: '달고나', amount: '15 g' }],
  },
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
    image: '/menu/chestnut-latte.svg', // 예시 그림 (실제 사진으로 바꿔도 된다)
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

// 34 AI 메뉴 추천 — '세트 구성' 탭 (화면 확인용 예시 값)
export const setRecommendations = [
  {
    id: 'latte-financier',
    name: '라떼 + 휘낭시에 세트',
    items: ['카페라떼', '휘낭시에'],
    price: 7000, // 따로 사면 8,000원
    regular: 8000,
    reason: '오후 2~5시 라떼 주문의 31%가 디저트를 함께 사요.',
    expected: '하루 세트 9건 예상',
  },
  {
    id: 'americano-cheesecake',
    name: '아메리카노 + 치즈케이크 세트',
    items: ['아이스 아메리카노', '치즈케이크'],
    price: 10000,
    regular: 11000,
    reason: '주말 오전에 두 메뉴를 함께 주문한 비율이 높아요.',
    expected: '주말 하루 6건 예상',
  },
]

// 34 AI 메뉴 추천 — '메뉴 개선' 탭 (화면 확인용 예시 값)
export const improveRecommendations = [
  {
    id: 'season-drink',
    menu: '시즌 음료',
    problem: '이번 주 12잔 · 지난주보다 40% 줄었어요.',
    suggestion: '판매를 멈추고 밤 라떼로 바꿔 보세요.',
    effect: '재료 재고 2종을 다른 메뉴에 쓸 수 있어요.',
  },
  {
    id: 'vanilla-cost',
    menu: '바닐라 라떼',
    problem: '바닐라 시럽 단가가 올라 원가율이 26%가 됐어요.',
    suggestion: '시럽을 20 ml → 15 ml로 줄이거나 판매가를 300원 올려 보세요.',
    effect: '원가율을 24%로 되돌릴 수 있어요.',
  },
]
