// 재고 목록 · 품목 상세가 함께 쓰는 계산 (관리 단위 기준)
// 가정: 실제 API 에서는 서버가 계산해서 내려준다. 지금은 목업 lots · safeStock · dailyUse 로 계산

// 목업 기준일 (다른 목업과 같은 날)
export const TODAY = new Date('2026-11-26T00:00:00')
const DAY = 24 * 60 * 60 * 1000
const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

/** 오늘부터 n일 뒤를 사람 말로 — 오늘 · 내일 · 11/29(일) */
export function dayText(days) {
  if (days <= 0) return '오늘'
  if (days === 1) return '내일'
  const d = new Date(TODAY.getTime() + days * DAY)
  return `${d.getMonth() + 1}/${d.getDate()}(${WEEKDAYS[d.getDay()]})`
}

/**
 * 품목 하나의 재고 상태
 *   state   : low(적정보다 적음) > expiring(소비기한 임박 태그) > check(실사 필요 태그) > ok
 *   packs   : 남은 구매 단위 수 (4팩) · stock : 관리 단위 (4,000ml)
 *   daysLeft: 다 떨어지기까지 남은 날 (하루 평균 사용량 기준)
 *   expiryDays: 가장 빠른 소비기한까지 남은 날
 */
export function stockInfo(item) {
  const lots = item.lots ?? []
  const packs = lots.reduce((sum, lot) => sum + lot.qty, 0)
  const stock = packs * (item.packSize || 1)
  const low = item.lots && item.safeStock ? stock < item.safeStock : item.tags?.includes('low')
  const state = low ? 'low' : item.tags?.includes('expiring') ? 'expiring' : item.tags?.includes('check') ? 'check' : 'ok'
  const expiries = lots.filter((lot) => lot.qty > 0 && lot.expiresAt).map((lot) => new Date(`${lot.expiresAt}T00:00:00`))
  const nearest = expiries.length ? Math.min(...expiries.map((d) => d.getTime())) : null
  return {
    packs,
    stock,
    state,
    daysLeft: item.dailyUse ? Math.floor(stock / item.dailyUse) : null,
    expiryDays: nearest == null ? null : Math.round((nearest - TODAY.getTime()) / DAY),
  }
}

/** 급한 것부터 — 부족(빨리 떨어지는 순) → 임박 → 실사 필요 → 나머지 */
const ORDER = { low: 0, expiring: 1, check: 2, ok: 3 }
export const byUrgency = (a, b) =>
  ORDER[a.info.state] - ORDER[b.info.state] || (a.info.daysLeft ?? 999) - (b.info.daysLeft ?? 999)

/** 카드 한 줄 문장 — 사장님 말로 */
export function stockMessage(item, info) {
  const left = `${info.packs}${item.packLabel ?? '개'} 남음`
  if (!item.lots) return item.value
  if (info.state === 'low' && info.daysLeft != null) {
    const when = info.daysLeft <= 1 ? `${dayText(info.daysLeft)} 떨어져요` : `${info.daysLeft}일 뒤 떨어져요`
    return `${when} · ${left}`
  }
  if (info.state === 'expiring' && info.expiryDays != null) {
    return `소비기한 ${info.expiryDays <= 0 ? '오늘까지' : `${info.expiryDays}일 남았어요`} · ${left}`
  }
  if (info.state === 'check') return `실사가 필요해요 · ${left}`
  return left
}
