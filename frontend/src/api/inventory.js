import { inventory } from '@/features/inventory/mock'

// 재고 품목 — 아직 API가 없어 화면용 목업으로 매장마다 상태를 따로 둔다
// 새로고침하면 초기화된다. 실제 API가 생기면 이 함수들을 request() 호출로 교체한다.
const itemsByStore = new Map()
let newSequence = 1

function itemsFor(storeId) {
  if (!itemsByStore.has(storeId)) itemsByStore.set(storeId, inventory.map((item) => ({ ...item })))
  return itemsByStore.get(storeId)
}

export async function getInventory(storeId) {
  return itemsFor(storeId).map((item) => ({ ...item }))
}

/**
 * 입고분(lots)이 바뀌면 목록 글자(value)와 '부족' 태그를 다시 맞춘다
 *   가정: 실제 API 에서는 서버가 재고 장부로 계산해 내려준다
 */
function withStock(item) {
  if (!item.lots) return item
  const packs = item.lots.reduce((sum, lot) => sum + lot.qty, 0)
  const low = item.safeStock ? packs * (item.packSize || 1) < item.safeStock : false
  const tags = (item.tags ?? []).filter((tag) => tag !== 'low')
  return { ...item, value: `추정 ${packs}${item.packLabel ?? '개'}`, tags: low ? ['low', ...tags] : tags }
}

function replaceItem(storeId, id, change) {
  const saved = itemsFor(storeId).map((item) => (item.id === id ? withStock(change(item)) : item))
  itemsByStore.set(storeId, saved)
  return saved.find((item) => item.id === id)
}

/** 품목 저장 — 있는 품목이면 수정, 없으면(예: new) 새로 추가 */
export async function saveInventoryItem(storeId, id, patch) {
  const items = itemsFor(storeId)
  if (items.some((item) => item.id === id)) return replaceItem(storeId, id, (item) => ({ ...item, ...patch }))
  const created = { id: `item-${newSequence++}`, value: '추정 0개', tags: ['check'], ...patch }
  itemsByStore.set(storeId, [...items, created])
  return created
}

/** 입고 확정 — 정상 수량만 새 입고분으로 더한다 (AGENTS 5-4: 정상 입고 확인 수량만 재고 반영) */
export async function receiveInventoryItem(storeId, id, { qty, receivedAt, expiresAt }) {
  // 받았으니 '입고 예정' 표시는 끝낸다
  return replaceItem(storeId, id, (item) => ({
    ...item,
    incoming: undefined,
    lots: [
      ...(item.lots ?? []),
      { id: `${id}-${Date.now()}`, receivedAt, qty, amount: qty * (item.packPrice ?? 0), expiresAt },
    ],
  }))
}

/**
 * 실사 — 실제로 센 수량(구매 단위)으로 맞춘다
 *   적으면 오래된 입고분부터 줄이고(먼저 쓴 것으로 본다), 많으면 차이만큼 실사 입고분을 더한다
 */
export async function adjustInventoryItem(storeId, id, counted, countedAt) {
  return replaceItem(storeId, id, (item) => {
    const lots = [...(item.lots ?? [])].sort((a, b) => a.receivedAt.localeCompare(b.receivedAt))
    let gap = lots.reduce((sum, lot) => sum + lot.qty, 0) - counted
    if (gap < 0) return { ...item, lots: [...lots, { id: `${id}-adj-${Date.now()}`, receivedAt: countedAt, qty: -gap, amount: 0, expiresAt: null }] }
    const next = lots
      .map((lot) => {
        const used = Math.min(lot.qty, gap)
        gap -= used
        return { ...lot, qty: lot.qty - used }
      })
      .filter((lot) => lot.qty > 0)
    return { ...item, lots: next }
  })
}
