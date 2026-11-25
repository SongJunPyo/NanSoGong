// 메뉴 화면 전용 시연 데이터. POS/DB 원본을 수정하지 않으며 실제 판매/검색 자료가 아니다.
const ingredient = (name, quantity, unit, itemId = null) => ({ name, quantity, unit, itemId })
const coffee = (ice = false, milk = false, vanilla = false) => [
  ingredient('원두', 18, 'G', 'bean'),
  ingredient(milk ? '우유' : '물', 200, 'ML', milk ? 'milk' : null),
  ...(vanilla ? [ingredient('바닐라 시럽', 20, 'ML', 'vanilla')] : []),
  ...(ice ? [ingredient('얼음', 150, 'G')] : []),
  ingredient('컵', 1, 'EA', 'cup'),
]

export const categories = [
  { id: 'coffee', name: '커피', parent: 'DRINK' },
  { id: 'non-coffee', name: '논커피', parent: 'DRINK' },
  { id: 'season', name: '시즌', parent: 'DRINK', seasonal: true },
  { id: 'dessert', name: '디저트', parent: 'FOOD' },
]

// 기존 시연용 id(americano, latte, vanilla, cheesecake)를 유지하여 기존 상세 주소도 연결한다.
export const menus = [
  { id: 'americano-hot', posCode: 'M101', name: '아메리카노 (HOT)', categoryId: 'coffee', price: 4500, cost: 820, temperatures: ['HOT'], recipe: coffee(), note: '추울수록 판매량 증가', priceHistory: [{ date: '2025-01-01', before: 4000, after: 4500 }] },
  { id: 'americano', posCode: 'M102', name: '아이스 아메리카노', categoryId: 'coffee', price: 4500, cost: 820, temperatures: ['ICE'], recipe: coffee(true), note: '더울수록 판매량 증가 · 판매량 1위', priceHistory: [{ date: '2025-01-01', before: 4000, after: 4500 }] },
  { id: 'latte', posCode: 'M103', name: '카페라떼 (HOT)', categoryId: 'coffee', price: 5000, cost: 1200, temperatures: ['HOT'], recipe: coffee(false, true), note: '추울수록 판매량 증가' },
  { id: 'iced-latte', posCode: 'M104', name: '아이스 카페라떼', categoryId: 'coffee', price: 5000, cost: null, temperatures: ['ICE'], recipe: coffee(true, true), note: '제공 자료 기준: 추울수록 판매량 증가' },
  { id: 'vanilla', posCode: 'M105', name: '바닐라라떼', categoryId: 'coffee', price: 5500, cost: 1450, temperatures: ['HOT', 'ICE'], recipe: coffee(true, true, true), note: '바닐라 시럽 사용' },
  { id: 'cold-brew', posCode: 'M106', name: '콜드브루', categoryId: 'coffee', price: 5000, cost: null, temperatures: ['ICE'], recipe: [ingredient('콜드브루 원액', 100, 'ML'), ingredient('물', 100, 'ML'), ingredient('얼음', 150, 'G')], note: '여름철 판매량 증가' },
  { id: 'green-tea-latte', posCode: 'M201', name: '녹차라떼', categoryId: 'non-coffee', price: 5500, cost: null, temperatures: ['HOT', 'ICE'], recipe: [ingredient('녹차 파우더', 25, 'G'), ingredient('우유', 200, 'ML', 'milk')], note: '일반 논커피 메뉴' },
  { id: 'grapefruit-ade', posCode: 'M202', name: '자몽에이드', categoryId: 'non-coffee', price: 6000, cost: null, temperatures: ['ICE'], recipe: [ingredient('자몽청', 50, 'G'), ingredient('탄산수', 200, 'ML'), ingredient('얼음', 150, 'G')], note: '여름철 판매량 크게 증가 · 기온 민감도 높음' },
  { id: 'strawberry-latte', posCode: 'M203', name: '딸기라떼', categoryId: 'season', price: 6000, cost: null, temperatures: ['ICE'], season: { from: 12, to: 4 }, recipe: [ingredient('딸기', 80, 'G'), ingredient('우유', 200, 'ML', 'milk')], note: '12월~4월 시즌 판매' },
  { id: 'milk-bingsu', posCode: 'M204', name: '우유빙수', categoryId: 'season', price: 9500, cost: null, temperatures: [], season: { from: 6, to: 8 }, recipe: [ingredient('우유', 300, 'ML', 'milk')], note: '6월~8월 시즌 판매' },
  { id: 'cheesecake', posCode: 'M301', name: '조각 케이크', categoryId: 'dessert', price: 6500, cost: 2300, temperatures: [], recipe: [ingredient('조각 케이크', 1, 'EA')], note: '주말 오후 판매량 증가' },
  { id: 'croffle', posCode: 'M302', name: '크로플', categoryId: 'dessert', price: 5000, cost: null, temperatures: [], recipe: [ingredient('크로플 생지', 1, 'EA')], launchedOn: '2025-03-01', note: '2025년 3월 출시' },
].map((menu) => ({ onSale: true, deletedAt: null, isNew: false, sizes: ['Regular'], launchedOn: '2024-01-01', ...menu }))

export const menuOptions = [
  // 사용자 제공 설명에 OPT01의 '6개'와 코드 목록이 일치하지 않아 대상을 추정하지 않는다.
  { id: 'OPT01', code: 'OPT01', name: '샷 추가', price: 500, menuIds: [], targetNote: '아메리카노·라떼류 6개 · 정확한 코드 확인 필요', needsConfirmation: true, recipe: [ingredient('원두', 9, 'G', 'bean')] },
  { id: 'OPT02', code: 'OPT02', name: '바닐라 시럽 추가', price: 500, menuIds: [], targetNote: '아메리카노·라떼류 · 정확한 코드 확인 필요', needsConfirmation: true, recipe: [ingredient('바닐라 시럽', 15, 'ML', 'vanilla')] },
  { id: 'OPT03', code: 'OPT03', name: '오트밀크 변경', price: 500, menuIds: ['latte', 'iced-latte', 'vanilla'], targetNote: '커피 라떼류 3개', needsConfirmation: false, recipe: [ingredient('우유', -200, 'ML', 'milk'), ingredient('오트밀크', 200, 'ML')] },
  { id: 'OPT04', code: 'OPT04', name: '디카페인 변경', price: 500, menuIds: ['americano-hot', 'americano', 'latte', 'iced-latte', 'vanilla', 'cold-brew'], targetNote: '커피 6개', needsConfirmation: false, recipe: [ingredient('원두', -18, 'G', 'bean'), ingredient('디카페인 원두', 18, 'G')] },
].map((option) => ({ ...option, deletedAt: null }))

// 날씨·판매량도 메뉴 UI 검증용으로 만든 독립 표본. 실제 POS/기상 데이터로 해석하지 않는다.
const baseQuantities = { M101: 42, M102: 86, M103: 33, M104: 29, M105: 28, M106: 18, M201: 15, M202: 12, M203: 9, M204: 5, M301: 20, M302: 24 }
const coldSensitive = ['M101', 'M103', 'M104']
const hotSensitive = ['M102', 'M106', 'M202']
export const salesRecords = []
for (let index = 0; index < 55; index++) {
  const date = new Date(Date.UTC(2026, 9, 1 + index)).toISOString().slice(0, 10)
  const month = Number(date.slice(5, 7))
  const weekDay = new Date(date + 'T12:00:00Z').getUTCDay()
  const weather = index % 8 === 0 ? 'RAIN' : index % 4 === 0 ? 'CLOUD' : 'SUN'
  const temperature = (month === 10 ? 19 : 12) + index % 7 - 3
  for (const menu of menus) {
    const inSeason = !menu.season || (menu.season.from <= menu.season.to ? month >= menu.season.from && month <= menu.season.to : month >= menu.season.from || month <= menu.season.to)
    if (!inSeason) continue
    const cold = coldSensitive.includes(menu.posCode) ? (20 - temperature) * 0.7 : 0
    const hot = hotSensitive.includes(menu.posCode) ? (temperature - 10) * (menu.posCode === 'M202' ? 1.4 : 0.5) : 0
    const weekend = menu.posCode === 'M301' && [0, 6].includes(weekDay) ? 16 : 0
    const drift = menu.posCode === 'M105' ? -index * 0.32 : menu.posCode === 'M102' ? index * 0.16 : 0
    const quantity = Math.max(1, Math.round(baseQuantities[menu.posCode] + cold + hot + weekend + drift + index % 5 - 2))
    salesRecords.push({ date, posCode: menu.posCode, weather, temperature, quantity, revenue: quantity * menu.price })
  }
}

export const demoPeriod = { from: '2026-11-18', to: '2026-11-24' }
export const pairSales = [
  { menuIds: ['americano', 'croffle'], orders: 56, totalOrders: 320, from: '2026-11-01', to: '2026-11-24' },
  { menuIds: ['latte', 'cheesecake'], orders: 38, totalOrders: 260, from: '2026-11-01', to: '2026-11-24' },
]

export const newMenuCandidates = [
  { name: '바닐라 오트라떼', categoryId: 'coffee', price: 5800, sizes: ['Regular'], temperatures: ['HOT', 'ICE'], recipe: [ingredient('원두', 18, 'G', 'bean'), ingredient('오트밀크', 200, 'ML'), ingredient('바닐라 시럽', 15, 'ML', 'vanilla')], keyword: '오트라떼', season: null },
  { name: '따뜻한 바닐라 밀크', categoryId: 'non-coffee', price: 5500, sizes: ['Regular'], temperatures: ['HOT'], recipe: [ingredient('우유', 200, 'ML', 'milk'), ingredient('바닐라 시럽', 15, 'ML', 'vanilla')], keyword: '따뜻한 논커피', season: null },
]

export function createMenuSeed() {
  return structuredClone({ version: 1, source: 'MOCK', menus, categories, options: menuOptions, recommendations: [], sets: [], salesRecords, pairSales, revision: 0 })
}
