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

/** 품목 저장 — 있는 품목이면 수정, 없으면(예: new) 새로 추가 */
export async function saveInventoryItem(storeId, id, patch) {
  const items = itemsFor(storeId)
  const exists = items.some((item) => item.id === id)
  const saved = exists
    ? items.map((item) => (item.id === id ? { ...item, ...patch } : item))
    : [...items, { id: `item-${newSequence++}`, value: '추정 0개', tags: ['check'], ...patch }]
  itemsByStore.set(storeId, saved)
  return saved.find((item) => item.id === id) ?? saved[saved.length - 1]
}
