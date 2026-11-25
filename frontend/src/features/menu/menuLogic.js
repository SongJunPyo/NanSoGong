export const GROUPS = [{ value: 'ALL', label: '전체' }, { value: 'DRINK', label: '음료' }, { value: 'FOOD', label: '푸드' }]
export const RECOMMENDATION_STATUSES = { PENDING: '검토 대기', APPROVED: '승인', HELD: '보류', REJECTED: '반려', REGISTERED: '등록 완료' }
export const UNITS = [{ value: 'G', label: 'g' }, { value: 'ML', label: 'ml' }, { value: 'EA', label: '개' }]
export const localToday = (now = new Date()) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now)
export const shortDate = (date) => date ? date.slice(5).replace('-', '.') : '—'
export const dayOffset = (date, days) => new Date(new Date(date + 'T12:00:00Z').getTime() + days * 86400000).toISOString().slice(0, 10)
export const numberOfDays = (from, to) => Math.round((new Date(to + 'T12:00:00Z') - new Date(from + 'T12:00:00Z')) / 86400000) + 1
export const seasonLabel = (season) => season ? season.from + '월~' + season.to + '월' : '상시'
export const categoryOf = (workspace, menu) => workspace.categories.find((category) => category.id === menu.categoryId)
export const recipeUnit = (unit) => UNITS.find((entry) => entry.value === unit)?.label ?? unit

export function inSeason(menu, date) {
  if (!menu.season) return true
  const month = Number(date.slice(5, 7)), { from, to } = menu.season
  return from <= to ? month >= from && month <= to : month >= from || month <= to
}

export function menuStatus(menu, date = localToday()) {
  if (menu.deletedAt) return { code: 'DELETED', label: '삭제됨', tone: 'gray' }
  if (!menu.onSale) return { code: 'PAUSED', label: '판매중지', tone: 'gray' }
  if (!inSeason(menu, date)) return { code: 'OFF_SEASON', label: '시즌 외', tone: 'amber' }
  return { code: 'SELLING', label: '판매중', tone: 'ok' }
}

export const emptyMenu = () => ({ name: '', posCode: '', categoryId: 'coffee', price: '', sizes: [], temperatures: [], season: { from: 12, to: 4 }, recipe: [], recipeConfirmed: false })

export function validateRecipe(recipe, delta = false) {
  if (!Array.isArray(recipe)) return '재료 목록을 확인해 주세요.'
  for (const row of recipe) {
    if (!row.name?.trim()) return '재료명을 입력해 주세요.'
    const quantity = Number(row.quantity)
    if (row.quantity === '' || !Number.isFinite(quantity) || (delta ? quantity === 0 : quantity <= 0) || Math.abs(quantity) > 1000000 || Math.abs(quantity * 1000 - Math.round(quantity * 1000)) > 0.00001) return delta ? '재료 증감량은 0이 아닌 숫자로, 소수점 셋째 자리까지 입력해 주세요.' : '재료 수량은 0보다 큰 숫자로, 소수점 셋째 자리까지 입력해 주세요.'
    if (!UNITS.some((unit) => unit.value === row.unit)) return '재료 단위를 선택해 주세요.'
  }
  return ''
}

export function validateMenu(draft, workspace) {
  if (!draft.name?.trim()) return '메뉴명을 입력해 주세요. 공백만 입력할 수는 없어요.'
  if (draft.name.trim().length > 100) return '메뉴명은 100자 이내로 입력해 주세요.'
  if (draft.price === '' || !Number.isSafeInteger(Number(draft.price)) || Number(draft.price) <= 0 || Number(draft.price) > 100000000) return '판매가는 0보다 큰 정수로 입력해 주세요.'
  const category = workspace.categories.find((entry) => entry.id === draft.categoryId)
  if (!category) return '메뉴 카테고리를 선택해 주세요.'
  if (category.seasonal && (!draft.season || ![draft.season.from, draft.season.to].every((month) => Number.isInteger(Number(month)) && month >= 1 && month <= 12))) return '시즌의 시작 월과 종료 월을 선택해 주세요.'
  if (draft.posCode && workspace.menus.some((menu) => menu.id !== draft.id && menu.posCode === draft.posCode.trim())) return '이미 연결된 POS 코드예요. 다른 메뉴와 같은 코드로 저장할 수 없어요.'
  if ((draft.sizes ?? []).some((size) => !['Small', 'Regular', 'Large'].includes(size)) || (draft.temperatures ?? []).some((value) => !['HOT', 'ICE'].includes(value))) return '사이즈와 HOT/ICE 선택을 확인해 주세요.'
  const recipeError = validateRecipe(draft.recipe)
  if (recipeError) return recipeError
  if (draft.recipe.length && !draft.recipeConfirmed) return '재료와 사용량을 확인한 뒤 레시피 확인에 체크해 주세요.'
  return ''
}

export function validateOption(draft, workspace) {
  if (!draft.name?.trim()) return '옵션명을 입력해 주세요.'
  if (!draft.code?.trim()) return '옵션 코드를 입력해 주세요.'
  if (workspace.options.some((option) => option.id !== draft.id && option.code === draft.code.trim())) return '이미 사용한 옵션 코드예요.'
  if (draft.price === '' || !Number.isSafeInteger(Number(draft.price)) || Number(draft.price) < 0 || Number(draft.price) > 100000000) return '추가 금액은 0 이상의 정수로 입력해 주세요.'
  if (!draft.menuIds?.length) return '옵션을 적용할 메뉴를 하나 이상 선택해 주세요.'
  if (draft.menuIds.some((id) => !workspace.menus.some((menu) => menu.id === id && !menu.deletedAt))) return '적용 메뉴 중 삭제되었거나 찾을 수 없는 메뉴가 있어요.'
  return validateRecipe(draft.recipe, true)
}

/** 옵션은 기본 레시피에 대한 증감량. 원본 배열/수량을 변경하지 않는다. */
export function previewOptions(menu, options) {
  const result = new Map()
  for (const row of [...menu.recipe, ...options.flatMap((option) => option.recipe)]) {
    const key = (row.itemId || row.name.replaceAll(' ', '')) + ':' + row.unit
    const previous = result.get(key)
    result.set(key, { ...row, quantity: Math.round(((previous?.quantity ?? 0) + Number(row.quantity)) * 1000) / 1000 })
  }
  const recipe = [...result.values()]
  return { price: menu.price + options.reduce((sum, option) => sum + option.price, 0), recipe: recipe.filter((row) => row.quantity !== 0), error: recipe.some((row) => row.quantity < 0) ? '기본 레시피보다 차감량이 큰 재료가 있어요. 레시피를 확인해 주세요.' : '' }
}

export function analyzeMenuSales(workspace, { from, to, group = 'ALL', weather = 'ALL' }) {
  const length = numberOfDays(from, to)
  if (!Number.isFinite(length) || length < 1 || length > 366) throw new Error('분석 기간은 시작일부터 종료일까지 1~366일로 선택해 주세요.')
  const previousTo = dayOffset(from, -1), previousFrom = dayOffset(from, -length)
  const current = workspace.salesRecords.filter((row) => row.date >= from && row.date <= to)
  const previous = workspace.salesRecords.filter((row) => row.date >= previousFrom && row.date <= previousTo)
  const weatherDays = new Set(current.filter((row) => weather === 'ALL' || row.weather === weather).map((row) => row.date)).size
  const allDays = new Set(current.map((row) => row.date)).size
  const totalRevenue = current.reduce((sum, row) => sum + row.revenue, 0)
  const ranking = workspace.menus.filter((menu) => group === 'ALL' || categoryOf(workspace, menu)?.parent === group).map((menu) => {
    const rows = current.filter((row) => row.posCode === menu.posCode)
    const beforeRows = previous.filter((row) => row.posCode === menu.posCode)
    const quantity = rows.reduce((sum, row) => sum + row.quantity, 0)
    const before = beforeRows.reduce((sum, row) => sum + row.quantity, 0)
    const revenue = rows.reduce((sum, row) => sum + row.revenue, 0)
    const ageAtStart = numberOfDays(menu.launchedOn ?? from, from)
    const activeThroughout = Array.from({ length }, (_, index) => dayOffset(from, index)).every((date) => inSeason(menu, date))
    const enoughData = new Set(rows.map((row) => row.date)).size === length && new Set(beforeRows.map((row) => row.date)).size === length
    const eligible = !menu.deletedAt && menu.onSale && activeThroughout && ageAtStart >= 14 && enoughData
    const weatherRows = rows.filter((row) => weather === 'ALL' || row.weather === weather)
    const weatherQuantity = weatherRows.reduce((sum, row) => sum + row.quantity, 0)
    const average = allDays ? quantity / allDays : null
    const weatherAverage = weatherDays >= 3 && weatherRows.length >= 3 ? weatherQuantity / weatherDays : null
    return {
      menu, quantity: rows.length ? quantity : null, revenue: rows.length ? revenue : null,
      previousQuantity: beforeRows.length ? before : null, change: enoughData && before > 0 ? (quantity - before) / before * 100 : null,
      contribution: totalRevenue > 0 ? revenue / totalRevenue * 100 : 0, eligible,
      excludedReason: menu.deletedAt ? '삭제된 메뉴의 과거 판매' : !menu.onSale ? '판매중지 메뉴' : !activeThroughout ? '분석 기간이 시즌 판매 기간 밖이에요' : ageAtStart < 14 ? '출시 직후 · 비교 자료 수집 중' : !enoughData ? '비교 자료 부족' : '',
      weatherQuantity: weatherAverage === null ? null : weatherQuantity, weatherAverage,
      weatherChange: average > 0 && weatherAverage !== null ? (weatherAverage - average) / average * 100 : null,
    }
  }).toSorted((a, b) => (b.quantity ?? -1) - (a.quantity ?? -1))
  let rank = 0
  ranking.forEach((row) => { row.rank = row.quantity === null ? null : ++rank })
  const eligible = ranking.filter((row) => row.eligible)
  const popular = eligible.toSorted((a, b) => b.quantity - a.quantity).slice(0, 3)
  const poor = eligible.filter((row) => row.change !== null && row.change < 0).toSorted((a, b) => a.change - b.change).slice(0, 3)
  return { ranking, popular, poor, weatherDays, allDays, previousFrom, previousTo, weatherEnough: weatherDays >= 3 }
}
