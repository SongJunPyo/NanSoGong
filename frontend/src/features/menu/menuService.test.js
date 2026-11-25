import assert from 'node:assert/strict'
import test from 'node:test'
import { createMenuService } from './menuService.js'
import { emptyMenu } from './menuLogic.js'

function setup() {
  let sequence = 0
  const service = createMenuService({ storage: null, now: () => new Date('2026-11-25T03:00:00Z'), makeId: () => String(++sequence), yieldTask: async () => {} })
  return service
}
const valid = (changes = {}) => ({ ...emptyMenu(), name: '테스트 메뉴', price: 4500, ...changes })

test('카테고리 등록은 상위 분류를 유지하고 전체·중복 이름은 거절한다', async () => {
  const service = setup()
  await assert.rejects(service.execute(1, { type: 'ADD_CATEGORY', payload: { name: '전체', parent: 'DRINK' } }), /전체/)
  const category = await service.execute(1, { type: 'ADD_CATEGORY', payload: { name: '베이커리', parent: 'FOOD' } })
  await service.execute(1, { type: 'SAVE_MENU', payload: valid({ categoryId: category.result.id }) })
  assert.equal(service.read(1).categories.find((entry) => entry.id === category.result.id).parent, 'FOOD')
  await assert.rejects(service.execute(1, { type: 'ADD_CATEGORY', payload: { name: '베이커리', parent: 'DRINK' } }), /이미 등록/)
})

test('저장은 중복 요청을 한 번만 반영하고 NEW는 첫 조회 처리 후 사라진다', async () => {
  const service = setup()
  const action = { type: 'SAVE_MENU', payload: valid(), operationId: 'once' }
  const created = await service.execute(1, action)
  await service.execute(1, action)
  assert.equal(service.read(1).menus.length, 13)
  assert.equal(service.read(1).menus[0].isNew, true)
  await service.execute(1, { type: 'MARK_SEEN', payload: { id: created.result.id } })
  assert.equal(service.read(1).menus[0].isNew, false)
  assert.equal(service.read(2).menus.length, 12)
})

test('메뉴 중지·삭제·복구는 판매 이력과 POS 코드를 보존한다', async () => {
  const service = setup()
  const sales = structuredClone(service.read(1).salesRecords)
  await service.execute(1, { type: 'SET_SALE', payload: { id: 'americano', onSale: false } })
  await service.execute(1, { type: 'DELETE_MENU', payload: { id: 'americano' } })
  assert.ok(service.read(1).menus.find((menu) => menu.id === 'americano').deletedAt)
  await service.execute(1, { type: 'RESTORE_MENU', payload: { id: 'americano' } })
  const menu = service.read(1).menus.find((entry) => entry.id === 'americano')
  assert.equal(menu.posCode, 'M102')
  assert.equal(menu.deletedAt, null)
  assert.equal(menu.onSale, false)
  assert.deepEqual(service.read(1).salesRecords, sales)
})

test('메뉴 편집으로 POS 코드나 기존 원가 데이터를 덮어쓰지 않는다', async () => {
  const service = setup()
  const menu = service.read(1).menus.find((entry) => entry.id === 'latte')
  await assert.rejects(service.execute(1, { type: 'SAVE_MENU', payload: { ...menu, posCode: 'M900', recipeConfirmed: true } }), /POS 코드/)
  await service.execute(1, { type: 'SAVE_MENU', payload: { ...menu, name: '수정한 카페라떼', cost: 0, recipeConfirmed: true } })
  const edited = service.read(1).menus.find((entry) => entry.id === 'latte')
  assert.equal(edited.cost, 1200)
  assert.equal(edited.posCode, 'M103')
})

test('옵션의 명시적 대상 선택·수정·삭제가 작동한다', async () => {
  const service = setup()
  const option = service.read(1).options[0]
  await assert.rejects(service.execute(1, { type: 'SAVE_OPTION', payload: option }), /메뉴를 하나 이상/)
  await service.execute(1, { type: 'SAVE_OPTION', payload: { ...option, menuIds: ['americano', 'latte'] } })
  const saved = service.read(1).options[0]
  assert.equal(saved.needsConfirmation, false)
  assert.deepEqual(saved.menuIds, ['americano', 'latte'])
  assert.equal(saved.recipe[0].quantity, 9)
  await service.execute(1, { type: 'DELETE_OPTION', payload: { id: saved.id } })
  assert.ok(service.read(1).options[0].deletedAt)
  assert.equal(service.read(1).menus.length, 12)
})

test('신메뉴 추천은 승인만으로 등록되지 않고 최종 저장 후 한 번만 반영된다', async () => {
  const service = setup()
  const created = await service.generateRecommendation(1, 'NEW')
  const recommendation = created.workspace.recommendations[0]
  assert.equal(recommendation.status, 'PENDING')
  assert.equal(recommendation.trend.connected, false)
  await assert.rejects(service.execute(1, { type: 'SAVE_MENU', payload: { ...recommendation.draft, recommendationId: recommendation.id, recipeConfirmed: true } }), /먼저 승인/)
  await service.execute(1, { type: 'RECOMMENDATION_STATUS', payload: { id: recommendation.id, status: 'APPROVED' } })
  assert.equal(service.read(1).menus.length, 12)
  const save = { type: 'SAVE_MENU', operationId: 'final-new', payload: { ...recommendation.draft, name: '사용자가 수정한 메뉴', recommendationId: recommendation.id, recipeConfirmed: true } }
  await service.execute(1, save); await service.execute(1, save)
  assert.equal(service.read(1).menus.length, 13)
  assert.equal(service.read(1).menus[0].name, '사용자가 수정한 메뉴')
  assert.equal(service.read(1).recommendations[0].status, 'REGISTERED')
  await assert.rejects(service.execute(1, { ...save, operationId: 'different' }), /이미 반영/)
})

test('보류·반려와 개선안 승인은 기존 메뉴를 자동 변경하지 않는다', async () => {
  const service = setup()
  const before = structuredClone(service.read(1).menus)
  let created = await service.generateRecommendation(1, 'NEW')
  await service.execute(1, { type: 'RECOMMENDATION_STATUS', payload: { id: created.result.id, status: 'HELD' } })
  await service.execute(1, { type: 'RECOMMENDATION_STATUS', payload: { id: created.result.id, status: 'REJECTED' } })
  created = await service.generateRecommendation(1, 'IMPROVE')
  const recommendation = created.workspace.recommendations[0]
  await service.execute(1, { type: 'RECOMMENDATION_STATUS', payload: { id: recommendation.id, status: 'APPROVED' } })
  assert.deepEqual(service.read(1).menus, before)
  await service.execute(1, { type: 'SAVE_MENU', payload: { ...recommendation.draft, recommendationId: recommendation.id, recipeConfirmed: true } })
  assert.equal(service.read(1).menus.length, 12)
  assert.equal(service.read(1).menus.find((menu) => menu.id === recommendation.targetId).posCode, 'M105')
})

test('세트는 승인·최종 확인 후 별도 구성안으로 저장하고 개별 POS 메뉴를 합치지 않는다', async () => {
  const service = setup()
  const response = await service.generateRecommendation(1, 'SET')
  const recommendation = response.workspace.recommendations[0]
  const action = { type: 'SAVE_SET', payload: { ...recommendation.draft, recommendationId: recommendation.id } }
  await assert.rejects(service.execute(1, action), /먼저 승인/)
  await service.execute(1, { type: 'RECOMMENDATION_STATUS', payload: { id: recommendation.id, status: 'APPROVED' } })
  await service.execute(1, action)
  assert.equal(service.read(1).sets.length, 1)
  assert.equal(service.read(1).menus.length, 12)
  assert.equal(service.read(1).sets[0].menuIds.length, 2)
})

test('저장소 오류는 기존 시연 데이터에 부분 변경을 남기지 않는다', async () => {
  const data = new Map()
  let fail = false
  const service = createMenuService({ storage: { getItem: (key) => data.get(key), setItem: (key, value) => { if (fail) throw new Error('quota'); data.set(key, value) } }, yieldTask: async () => {} })
  await service.execute(1, { type: 'SAVE_MENU', payload: valid() })
  const before = structuredClone(service.read(1))
  fail = true
  await assert.rejects(service.execute(1, { type: 'DELETE_MENU', payload: { id: 'latte' } }), /저장하지 못/)
  assert.deepEqual(service.read(1), before)
})

test('레시피 시연은 재료와 원본 입력을 보존하며 실제 검색 완료를 주장하지 않는다', async () => {
  const service = setup()
  const draft = valid({ name: '아이스 아메리카노', temperatures: ['ICE'] })
  const result = await service.recommendRecipe(draft)
  assert.equal(result.source, 'MOCK')
  assert.deepEqual(result.recipe.map((row) => [row.name, row.quantity, row.unit]), [['원두', 18, 'G'], ['물', 200, 'ML'], ['얼음', 150, 'G'], ['컵', 1, 'EA']])
  assert.equal(draft.recipe.length, 0)
  const green = await service.recommendRecipe(valid({ name: '녹차라떼' }))
  assert.ok(!green.recipe.some((row) => row.name === '원두'))
})
