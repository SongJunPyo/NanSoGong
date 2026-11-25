import { createMenuSeed, demoPeriod, newMenuCandidates } from './mock.js'
import { analyzeMenuSales, emptyMenu, localToday, validateMenu, validateOption } from './menuLogic.js'

const copy = (value) => structuredClone(value)
const failure = (message) => new Error(message)
const yieldFrame = () => typeof requestAnimationFrame === 'function' ? new Promise((resolve) => requestAnimationFrame(resolve)) : Promise.resolve()

/**
 * 메뉴 화면 전용 Mock 어댑터. HTTP/DB/POS/LLM 호출은 하지 않는다.
 * 실제 API 연결 시 동일 책임의 어댑터로 교체하며 아래 모델을 확정된 서버 DTO로 보지 않는다.
 * localStorage에는 매장별 시연 메뉴만 저장한다. 인증값은 저장하지 않는다.
 */
export function createMenuService({ storage, now = () => new Date(), makeId = () => crypto.randomUUID(), yieldTask = yieldFrame } = {}) {
  const memory = new Map()
  const storageKey = (storeId) => 'nansogong-menu-demo-v1:' + (storeId ?? 'preview')
  const getStorage = () => storage === undefined ? (typeof window === 'undefined' ? null : window.localStorage) : storage
  const timestamp = () => now().toISOString()

  function read(storeId) {
    let raw
    try { raw = getStorage()?.getItem(storageKey(storeId)) ?? memory.get(storageKey(storeId)) }
    catch { throw failure('시연 메뉴 저장소를 읽을 수 없어요. 브라우저 저장소 설정을 확인해 주세요.') }
    if (!raw) return createMenuSeed()
    try {
      const data = JSON.parse(raw)
      if (data.version !== 1 || !Array.isArray(data.menus) || !Array.isArray(data.categories) || !Array.isArray(data.options) || !Array.isArray(data.recommendations) || !Array.isArray(data.salesRecords)) throw new Error('Invalid menu workspace')
      return data
    } catch { throw failure('저장된 시연 메뉴 자료를 읽지 못했어요. 기존 자료를 덮어쓰지 않았어요.') }
  }

  function persist(storeId, workspace) {
    const value = JSON.stringify(workspace)
    try {
      const target = getStorage()
      if (target) target.setItem(storageKey(storeId), value)
      else memory.set(storageKey(storeId), value)
    } catch { throw failure('메뉴를 저장하지 못했어요. 브라우저 저장 공간을 확인한 뒤 다시 시도해 주세요.') }
  }

  async function execute(storeId, { type, payload = {}, operationId }) {
    await yieldTask()
    // 선행 비동기 작업 이후 최신 상태를 읽고 동기적으로 검증/저장하여 다른 변경을 덮어쓰지 않는다.
    const workspace = read(storeId)
    workspace.operations ??= {}
    if (operationId && workspace.operations[operationId]) return { workspace, result: workspace.operations[operationId] }
    let result = null
    const findMenu = (id) => {
      const menu = workspace.menus.find((entry) => entry.id === id)
      if (!menu) throw failure('메뉴를 찾을 수 없어요.')
      return menu
    }
    if (type === 'SAVE_MENU') {
      const error = validateMenu(payload, workspace)
      if (error) throw failure(error)
      const existing = payload.id ? findMenu(payload.id) : null
      if (existing?.deletedAt) throw failure('삭제된 메뉴는 먼저 메뉴 기록에서 복구해 주세요.')
      if (existing?.posCode && payload.posCode !== existing.posCode) throw failure('연결된 POS 코드는 변경할 수 없어요. 기존 판매 연결을 유지해 주세요.')
      const recommendation = payload.recommendationId ? workspace.recommendations.find((entry) => entry.id === payload.recommendationId) : null
      if (payload.recommendationId && (!recommendation || recommendation.status !== 'APPROVED')) throw failure('추천안을 먼저 승인한 뒤 최종 저장해 주세요. 이미 반영한 추천은 다시 등록할 수 없어요.')
      if (recommendation?.kind === 'IMPROVE' && recommendation.targetId !== existing?.id) throw failure('개선 대상 메뉴가 일치하지 않아요.')
      const category = workspace.categories.find((entry) => entry.id === payload.categoryId)
      const menu = {
        ...(existing ?? { id: 'menu-' + makeId(), onSale: true, deletedAt: null, launchedOn: localToday(now()), cost: null, isNew: true }),
        name: payload.name.trim(), categoryId: payload.categoryId, price: Number(payload.price),
        posCode: payload.posCode?.trim() || null,
        sizes: [...payload.sizes], temperatures: [...payload.temperatures],
        season: category.seasonal ? { from: Number(payload.season.from), to: Number(payload.season.to) } : null,
        recipe: payload.recipe.map((row) => ({ ...row, name: row.name.trim(), quantity: Number(row.quantity) })),
        updatedAt: timestamp(),
      }
      if (existing) workspace.menus = workspace.menus.map((entry) => entry.id === menu.id ? menu : entry)
      else workspace.menus.unshift(menu)
      if (recommendation) Object.assign(recommendation, { status: 'REGISTERED', appliedId: menu.id, updatedAt: timestamp() })
      result = { id: menu.id, name: menu.name }
    } else if (type === 'ADD_CATEGORY') {
      const name = payload.name?.trim()
      if (!name || name.length > 20 || name === '전체') throw failure('카테고리는 전체를 제외한 1~20자 이름으로 입력해 주세요.')
      if (!['DRINK', 'FOOD'].includes(payload.parent)) throw failure('상위 분류를 음료 또는 푸드로 선택해 주세요.')
      if (workspace.categories.some((category) => category.name.toLowerCase() === name.toLowerCase())) throw failure('이미 등록된 카테고리예요.')
      const category = { id: 'category-' + makeId(), name, parent: payload.parent }
      workspace.categories.push(category)
      result = category
    } else if (type === 'SAVE_OPTION') {
      const error = validateOption(payload, workspace)
      if (error) throw failure(error)
      const existing = payload.id ? workspace.options.find((option) => option.id === payload.id && !option.deletedAt) : null
      if (payload.id && !existing) throw failure('수정할 옵션을 찾을 수 없어요.')
      if (existing && existing.code !== payload.code) throw failure('기존 옵션 코드는 유지해 주세요.')
      const option = { ...payload, id: existing?.id ?? 'option-' + makeId(), code: payload.code.trim(), name: payload.name.trim(), price: Number(payload.price), recipe: payload.recipe.map((row) => ({ ...row, name: row.name.trim(), quantity: Number(row.quantity) })), needsConfirmation: false, deletedAt: null }
      if (existing) workspace.options = workspace.options.map((entry) => entry.id === option.id ? option : entry)
      else workspace.options.push(option)
      result = { id: option.id }
    } else if (type === 'DELETE_OPTION') {
      const option = workspace.options.find((entry) => entry.id === payload.id)
      if (!option) throw failure('옵션을 찾을 수 없어요.')
      option.deletedAt = timestamp()
    } else if (['SET_SALE', 'DELETE_MENU', 'RESTORE_MENU', 'MARK_SEEN'].includes(type)) {
      const menu = findMenu(payload.id)
      if (type === 'DELETE_MENU') Object.assign(menu, { saleBeforeDelete: menu.onSale, deletedAt: timestamp(), onSale: false, isNew: false })
      if (type === 'RESTORE_MENU') Object.assign(menu, { deletedAt: null, onSale: menu.saleBeforeDelete ?? true })
      if (type === 'SET_SALE') {
        if (menu.deletedAt) throw failure('삭제된 메뉴는 먼저 복구해 주세요.')
        menu.onSale = Boolean(payload.onSale)
        menu.seasonPreparedAt = menu.onSale && menu.season ? timestamp() : null
      }
      if (type === 'MARK_SEEN') menu.isNew = false
      menu.updatedAt = timestamp()
    } else if (type === 'ADD_RECOMMENDATION') {
      workspace.recommendations.unshift({ ...payload, id: 'recommendation-' + makeId(), status: 'PENDING', createdAt: timestamp(), updatedAt: timestamp() })
      result = { id: workspace.recommendations[0].id }
    } else if (type === 'RECOMMENDATION_STATUS') {
      const recommendation = workspace.recommendations.find((entry) => entry.id === payload.id)
      if (!recommendation) throw failure('추천안을 찾을 수 없어요.')
      if (recommendation.status === 'REGISTERED') throw failure('이미 반영된 추천안의 상태는 바꿀 수 없어요.')
      if (!['PENDING', 'APPROVED', 'HELD', 'REJECTED'].includes(payload.status)) throw failure('추천 상태를 확인해 주세요.')
      Object.assign(recommendation, { status: payload.status, updatedAt: timestamp() })
      result = copy(recommendation)
    } else if (type === 'SAVE_SET') {
      const recommendation = workspace.recommendations.find((entry) => entry.id === payload.recommendationId)
      if (!recommendation || recommendation.kind !== 'SET' || recommendation.status !== 'APPROVED') throw failure('세트 추천을 먼저 승인해 주세요. 이미 반영한 추천은 중복 저장할 수 없어요.')
      const ids = [...new Set(payload.menuIds ?? [])]
      if (ids.length < 2 || ids.some((id) => !workspace.menus.some((menu) => menu.id === id && !menu.deletedAt))) throw failure('삭제되지 않은 메뉴를 두 개 이상 선택해 주세요.')
      const regular = ids.reduce((sum, id) => sum + findMenu(id).price, 0)
      if (!payload.name?.trim() || !Number.isSafeInteger(Number(payload.price)) || Number(payload.price) <= 0 || Number(payload.price) > regular) throw failure('세트명과 개별 가격 합계 이하의 세트 가격을 입력해 주세요.')
      const set = { id: 'set-' + makeId(), name: payload.name.trim(), menuIds: ids, price: Number(payload.price), regular, createdAt: timestamp(), posConnected: false }
      workspace.sets.push(set)
      Object.assign(recommendation, { status: 'REGISTERED', appliedId: set.id, updatedAt: timestamp() })
      result = { id: set.id }
    } else throw failure('지원하지 않는 메뉴 작업이에요.')
    workspace.revision++
    if (operationId) workspace.operations[operationId] = result ?? { done: true }
    persist(storeId, workspace)
    return { workspace: copy(workspace), result }
  }

  async function recommendRecipe(draft, onStage = () => {}) {
    onStage('메뉴 정보에 맞는 시연 레시피를 찾고 있어요.')
    await yieldTask()
    const name = draft.name?.trim() ?? ''
    if (!name) throw failure('레시피를 추천받을 메뉴명을 먼저 입력해 주세요.')
    const ice = name.includes('아이스') || draft.temperatures?.includes('ICE')
    const row = (name, quantity, unit, itemId = null) => ({ name, quantity, unit, itemId })
    let recipe
    if (name.includes('아메리카노')) recipe = [row('원두', 18, 'G', 'bean'), row('물', 200, 'ML'), ...(ice ? [row('얼음', 150, 'G')] : []), row('컵', 1, 'EA', 'cup')]
    else if (name.includes('녹차')) recipe = [row('녹차 파우더', 25, 'G'), row('우유', 200, 'ML', 'milk'), ...(ice ? [row('얼음', 150, 'G')] : [])]
    else if (name.includes('딸기')) recipe = [row('딸기', 80, 'G'), row('우유', 200, 'ML', 'milk'), ...(ice ? [row('얼음', 150, 'G')] : [])]
    else if (name.includes('라떼') || name.includes('밀크')) recipe = [...(name.includes('라떼') ? [row('원두', 18, 'G', 'bean')] : []), row(name.includes('오트') ? '오트밀크' : '우유', 200, 'ML', name.includes('오트') ? null : 'milk'), ...(name.includes('바닐라') ? [row('바닐라 시럽', 15, 'ML', 'vanilla')] : []), ...(ice ? [row('얼음', 150, 'G')] : []), row('컵', 1, 'EA', 'cup')]
    else throw failure('이 메뉴의 시연 레시피가 아직 없어요. 재료를 직접 추가해 주세요.')
    onStage('추천 재료와 단위를 확인하고 있어요.')
    await yieldTask()
    return { source: 'MOCK', recipe }
  }

  async function generateRecommendation(storeId, kind, onStage = () => {}) {
    onStage('시연 판매 데이터를 확인하고 있어요.')
    await yieldTask()
    const workspace = read(storeId)
    onStage('메뉴별 판매 패턴을 집계하고 있어요.')
    await yieldTask()
    const analysis = analyzeMenuSales(workspace, demoPeriod)
    const best = analysis.popular[0], poor = analysis.poor[0]
    if (!best) throw failure('추천에 필요한 판매 데이터가 부족합니다.')
    const evidence = [best.menu.name + ' · 판매 ' + best.quantity + '개 · 순위 ' + best.rank + '위', poor ? poor.menu.name + ' · 직전 기간 대비 ' + poor.change.toFixed(1) + '%' : '현재 비교 가능한 감소 메뉴 없음']
    let recommendation
    if (kind === 'NEW') {
      const count = workspace.recommendations.filter((entry) => entry.kind === 'NEW').length
      const candidate = copy(newMenuCandidates[count % newMenuCandidates.length])
      recommendation = { kind, name: candidate.name, reason: '인기 커피의 재료를 활용하고 기존 라떼와 다른 구성을 검토해 보세요.', evidence, period: demoPeriod, trend: { connected: false, keyword: candidate.keyword, note: '계절·관심 키워드 시연 예시 · 네이버 검색량 미조회' }, operatingPeriod: '겨울철 12월~2월 시험 운영', draft: { ...emptyMenu(), ...candidate, recipeConfirmed: false } }
    } else if (kind === 'SET') {
      const pair = workspace.pairSales.find((entry) => entry.menuIds.every((id) => workspace.menus.some((menu) => menu.id === id && !menu.deletedAt && menu.onSale)))
      if (!pair) throw failure('세트 구성을 추천할 함께 판매된 메뉴 자료가 부족합니다.')
      const selected = pair.menuIds.map((id) => workspace.menus.find((menu) => menu.id === id))
      const regular = selected.reduce((sum, menu) => sum + menu.price, 0)
      recommendation = { kind, name: selected.map((menu) => menu.name).join(' + ') + ' 세트', reason: '함께 주문된 시연 이력이 있는 메뉴로 묶어보기 좋은 조합이에요.', evidence: [...evidence, '시연 동시 주문 ' + pair.orders + '/' + pair.totalOrders + '건 · ' + pair.from + '~' + pair.to], period: demoPeriod, draft: { name: selected.map((menu) => menu.name).join(' + ') + ' 세트', menuIds: pair.menuIds, price: Math.floor(regular * 0.9 / 100) * 100 }, regular }
    } else if (kind === 'IMPROVE') {
      if (!poor) throw failure('비교 자료가 충분한 판매 감소 메뉴가 없어요. 기간을 늘려 확인해 주세요.')
      const menu = poor.menu
      const recipe = copy(menu.recipe).map((row) => row.name.includes('바닐라') ? { ...row, quantity: 15 } : row)
      recommendation = { kind, name: menu.name + ' 개선안', targetId: menu.id, reason: '판매가 감소한 메뉴의 이름과 레시피를 검토해 보세요. 맛과 수요 반응은 직접 확인해야 해요.', evidence, period: demoPeriod, before: copy(menu), draft: { ...copy(menu), name: menu.name + ' 클래식', recipe, recipeConfirmed: false }, changes: ['메뉴명을 더 명확하게 안내', '바닐라 시럽 사용량을 15ml 초안으로 검토', '판매가는 유지하고 사용자 확인 후 반영'] }
    } else throw failure('추천 종류를 확인해 주세요.')
    onStage('판매 근거와 추천안을 구성하고 있어요.')
    await yieldTask()
    return execute(storeId, { type: 'ADD_RECOMMENDATION', payload: { ...recommendation, source: 'MOCK' } })
  }

  return { read, getWorkspace: async (storeId) => { await yieldTask(); return copy(read(storeId)) }, execute, recommendRecipe, generateRecommendation }
}

export const menuService = createMenuService()
