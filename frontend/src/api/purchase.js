import { deliveries, orders } from '@/features/purchase/mock'
import { receiveInventoryItem } from '@/api/inventory'

// 발주 · 입고 — 아직 API가 없어 화면용 목업으로 매장마다 상태를 따로 둔다
// 새로고침하면 초기화된다. 실제 API가 생기면 이 함수들을 request() 호출로 교체한다.
const stateByStore = new Map()

function stateFor(storeId) {
  if (!stateByStore.has(storeId)) {
    stateByStore.set(storeId, {
      orders: orders.map((order) => ({ ...order })),
      deliveries: deliveries.map((line) => ({ ...line, received: 0 })),
      requests: new Map(), // 입고 확정 요청 id → 결과 (같은 요청은 한 번만 반영)
    })
  }
  return stateByStore.get(storeId)
}

export async function getOrders(storeId) {
  return stateFor(storeId).orders.map((order) => ({ ...order }))
}

/** 아직 다 받지 않은 입고 줄만 — remaining: 이번에 받을 수 있는 최대 수량 */
export async function getDeliveries(storeId) {
  return stateFor(storeId)
    .deliveries.map((line) => ({ ...line, remaining: line.ordered - line.received }))
    .filter((line) => line.remaining > 0)
}

/**
 * 입고 확정 — 품목별 받은 수량(got) 중 정상 수량(ok)만 재고에 더한다
 *   requestId: 화면을 열 때 한 번 만든 값. 같은 id 로 다시 오면(두 번 누름 · 재시도) 처음 결과를 그대로 돌려준다
 *   받은 만큼 발주 줄의 received 를 늘리고, 남은 수량은 재고의 '입고 예정'과 발주 상태(부분 입고)에 남긴다
 * @param lines [{ deliveryId, got, ok, expiresAt }]
 */
export function confirmDelivery(storeId, requestId, lines) {
  const state = stateFor(storeId)
  if (state.requests.has(requestId)) return state.requests.get(requestId)
  const run = (async () => {
    // 먼저 전부 검사하고, 하나라도 틀리면 아무것도 반영하지 않는다
    for (const line of lines) {
      const d = state.deliveries.find((x) => x.id === line.deliveryId)
      if (!d) throw new Error('이미 처리된 입고예요. 화면을 새로 불러와 주세요.')
      const remaining = d.ordered - d.received
      if (line.got > remaining) throw new Error(`${d.name}은 남은 수량(${remaining}개)보다 많이 받을 수 없어요.`)
      if (line.ok > line.got) throw new Error(`${d.name} 정상 수량이 받은 수량보다 많아요.`)
    }
    for (const line of lines) {
      const d = state.deliveries.find((x) => x.id === line.deliveryId)
      d.received += line.got
      const left = d.ordered - d.received
      await receiveInventoryItem(storeId, d.itemId, { qty: line.ok, receivedAt: '2026-11-26', expiresAt: line.expiresAt, incomingLeft: left })
      state.orders = state.orders.map((order) =>
        order.id !== d.orderId
          ? order
          : left === 0
            ? { ...order, status: '입고 완료', tone: 'ok', group: 'done', sub: `${order.sub.split(' · ').slice(0, 2).join(' · ')} · 11.26 입고` }
            : { ...order, status: '부분 입고', tone: 'blue', group: 'progress', sub: `${order.sub.split(' · ').slice(0, 2).join(' · ')} · ${left}개 미입고` },
      )
    }
    return { received: lines.reduce((sum, line) => sum + line.ok, 0) }
  })()
  state.requests.set(requestId, run)
  // 실패한 요청은 같은 id 로 다시 시도할 수 있게 지운다 (반영된 것이 없으니)
  run.catch(() => state.requests.delete(requestId))
  return run
}
