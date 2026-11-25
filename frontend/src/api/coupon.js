import { promotions } from '@/features/coupon/mock'
import { endHomeEvent } from '@/api/home'
import { todayDateKey } from '@/utils/format'

// 프로모션 목록 · 운영 종료 — 아직 API가 없어 화면용 목업으로 매장마다 상태를 따로 둔다
// 새로고침하면 초기화된다. 실제 API가 생기면 이 함수들을 request() 호출로 교체한다.
const promotionsByStore = new Map()

function promotionsFor(storeId) {
  if (!promotionsByStore.has(storeId)) promotionsByStore.set(storeId, promotions.map((p) => ({ ...p })))
  return promotionsByStore.get(storeId)
}

export async function getPromotions(storeId) {
  return promotionsFor(storeId).map((p) => ({ ...p }))
}

/** 운영 종료 — 오늘을 종료일로 바꾸고, 홈 캘린더의 프로모션 일정도 오늘까지로 줄인다 */
export async function endPromotion(storeId, promotionId) {
  const today = todayDateKey()
  const updated = promotionsFor(storeId).map((p) =>
    p.id === promotionId && p.status === 'running'
      ? { ...p, status: 'ended', endedBy: 'owner', endDate: today < p.endDate ? today : p.endDate }
      : p,
  )
  promotionsByStore.set(storeId, updated)
  const ended = updated.find((p) => p.id === promotionId)
  if (ended?.eventId) await endHomeEvent(storeId, ended.eventId, ended.endDate)
  return ended
}
