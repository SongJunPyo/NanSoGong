import assert from 'node:assert/strict'
import test from 'node:test'
import { createMenuSeed, demoPeriod } from './mock.js'
import { analyzeMenuSales, emptyMenu, inSeason, menuStatus, previewOptions, validateMenu } from './menuLogic.js'

const expected = [
  ['M101', '아메리카노 (HOT)', 4500], ['M102', '아이스 아메리카노', 4500],
  ['M103', '카페라떼 (HOT)', 5000], ['M104', '아이스 카페라떼', 5000],
  ['M105', '바닐라라떼', 5500], ['M106', '콜드브루', 5000],
  ['M201', '녹차라떼', 5500], ['M202', '자몽에이드', 6000],
  ['M203', '딸기라떼', 6000], ['M204', '우유빙수', 9500],
  ['M301', '조각 케이크', 6500], ['M302', '크로플', 5000],
]

test('POS 메뉴 12개와 옵션 4개를 정확히 반영하고 불명확한 옵션 연결은 만들지 않는다', () => {
  const workspace = createMenuSeed()
  assert.deepEqual(workspace.menus.map((menu) => [menu.posCode, menu.name, menu.price]), expected)
  assert.deepEqual(workspace.options.map((option) => option.code), ['OPT01', 'OPT02', 'OPT03', 'OPT04'])
  assert.ok(workspace.options.slice(0, 2).every((option) => option.needsConfirmation && option.menuIds.length === 0))
  assert.equal(workspace.options[2].menuIds.length, 3)
  assert.equal(workspace.options[3].menuIds.length, 6)
  assert.equal(new Set(workspace.menus.map((menu) => menu.posCode)).size, 12)
})

test('연도를 넘는 시즌과 판매 상태를 구분한다', () => {
  const strawberry = createMenuSeed().menus.find((menu) => menu.posCode === 'M203')
  for (const date of ['2026-12-01', '2027-01-01', '2027-04-30']) assert.equal(inSeason(strawberry, date), true)
  assert.equal(inSeason(strawberry, '2026-11-25'), false)
  assert.equal(menuStatus(strawberry, '2026-11-25').code, 'OFF_SEASON')
  assert.equal(menuStatus({ ...strawberry, onSale: false }, '2026-12-01').code, 'PAUSED')
  assert.equal(menuStatus({ ...strawberry, deletedAt: '2026-11-25' }, '2026-12-01').code, 'DELETED')
})

test('공백 이름·음수 가격·확인하지 않은 레시피는 저장할 수 없다', () => {
  const workspace = createMenuSeed()
  const valid = { ...emptyMenu(), name: '새 메뉴', price: 4500 }
  assert.equal(validateMenu(valid, workspace), '')
  assert.match(validateMenu({ ...valid, name: '   ' }, workspace), /메뉴명/)
  assert.match(validateMenu({ ...valid, price: -4500 }, workspace), /판매가/)
  assert.match(validateMenu({ ...valid, price: 4500.5 }, workspace), /판매가/)
  assert.match(validateMenu({ ...valid, categoryId: 'ALL' }, workspace), /카테고리/)
  assert.match(validateMenu({ ...valid, recipe: [{ name: '원두', quantity: 18, unit: 'G' }] }, workspace), /레시피 확인/)
})

test('옵션 가격과 재료 증감은 원본 레시피를 변경하지 않고 반영된다', () => {
  const workspace = createMenuSeed()
  const latte = workspace.menus.find((menu) => menu.id === 'latte')
  const before = structuredClone(latte)
  const preview = previewOptions(latte, [workspace.options[2]])
  assert.equal(preview.price, 5500)
  assert.equal(preview.error, '')
  assert.ok(!preview.recipe.some((row) => row.itemId === 'milk'))
  assert.equal(preview.recipe.find((row) => row.name === '오트밀크').quantity, 200)
  assert.deepEqual(latte, before)
})

test('분석은 POS 코드로 집계하며 시즌 외·중지·신규 메뉴를 부진에서 제외한다', () => {
  const workspace = createMenuSeed()
  const result = analyzeMenuSales(workspace, demoPeriod)
  assert.equal(result.ranking[0].menu.posCode, 'M102')
  assert.ok(result.poor.some((row) => row.menu.posCode === 'M105'))
  assert.ok(!result.poor.some((row) => ['M203', 'M204'].includes(row.menu.posCode)))
  const food = analyzeMenuSales(workspace, { ...demoPeriod, group: 'FOOD' })
  assert.deepEqual(new Set(food.ranking.map((row) => row.menu.posCode)), new Set(['M301', 'M302']))
  const vanilla = workspace.menus.find((menu) => menu.posCode === 'M105')
  vanilla.onSale = false
  assert.ok(!analyzeMenuSales(workspace, demoPeriod).poor.some((row) => row.menu.id === vanilla.id))
  vanilla.onSale = true; vanilla.launchedOn = '2026-11-20'
  assert.ok(!analyzeMenuSales(workspace, demoPeriod).poor.some((row) => row.menu.id === vanilla.id))
})

test('날씨 표본 부족과 비교 기간 누락을 임의의 수치로 보완하지 않는다', () => {
  const workspace = createMenuSeed()
  const snow = analyzeMenuSales(workspace, { ...demoPeriod, weather: 'SNOW' })
  assert.equal(snow.weatherDays, 0)
  assert.equal(snow.weatherEnough, false)
  assert.ok(snow.ranking.every((row) => row.weatherAverage === null))
  const partial = analyzeMenuSales(workspace, { from: '2026-10-26', to: '2026-11-24' })
  assert.ok(partial.ranking.every((row) => row.change === null))
  assert.equal(partial.poor.length, 0)
})
