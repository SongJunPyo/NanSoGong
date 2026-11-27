// 재고 목록 · 품목 상세가 함께 쓰는 계산
// 가정: 실제 API 에서는 서버가 계산해서 내려준다. 지금은 목업 lots · safeStock · dailyUse · incoming 으로 계산

// 목업 기준일 · 데이터 시각 (다른 목업과 같은 날)
export const TODAY_KEY = '2026-11-26'
export const TODAY = new Date(`${TODAY_KEY}T00:00:00`)
/** 소비기한이 지난 입고분인가 — 재고 카드 · 실사 · 폐기 · 저장 함수가 모두 이 기준 하나를 쓴다 */
export const isExpiredLot = (lot) => Boolean(lot.expiresAt) && lot.expiresAt < TODAY_KEY
export const DATA_AT = 'POS 기준 16:50'
export const NOW_TEXT = '2026.11.26 16:50' // 실사 · 폐기 기본 시각 (목업 기준일)
const DAY = 24 * 60 * 60 * 1000
const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

// 상태 규칙 (재고 카드 설계안)
export const LOW_DAYS = 2 // 소진까지 2일 이하 → 부족
export const EXPIRY_DAYS = 3 // 소비기한 3일 이하 → 임박

/**
 * 상태 4종 — 뱃지는 글자 + 기호를 같이 써서 색 없이도 구분된다
 *   bar: 막대 색 · badge: 뱃지 색 · order: 목록 정렬 순서
 */
export const STATES = {
  low: { label: '부족', mark: '●', badge: 'bg-danger-bg text-danger', bar: 'bg-danger', order: 0 },
  // 임박은 양이 문제가 아니라 기한이 문제라 막대는 회색(양), 경고는 뱃지로만 — 꽉 찬 주황 막대가 '충분'과 '경고'를 동시에 말하지 않게
  expiring: { label: '임박', mark: '◐', badge: 'bg-warning-bg text-amber-800', bar: 'bg-[#9CA3AF]', order: 1 },
  incoming: { label: '입고 예정', mark: '⇣', badge: 'bg-woori-tint text-woori-deep', bar: 'bg-woori-blue', order: 2 },
  ok: { label: '여유', mark: '○', badge: 'bg-surface-muted text-[#4B5563]', bar: 'bg-[#9CA3AF]', order: 3 },
}

/** 오늘부터 n일 뒤를 사람 말로 — 오늘 · 내일 · 11/29(일) */
export function dayText(days) {
  if (days <= 0) return '오늘'
  if (days === 1) return '내일'
  const d = new Date(TODAY.getTime() + days * DAY)
  return `${d.getMonth() + 1}/${d.getDate()}(${WEEKDAYS[d.getDay()]})`
}

/** 수량 표시 — 한 카드 안의 단위는 '개' 하나로 (소수는 한 자리) */
export const qtyText = (n) => `${Number.isInteger(n) ? n.toLocaleString('ko-KR') : n.toFixed(1)}개`

/**
 * 품목 하나의 재고 상태 — 모든 수량은 구매 단위 '개' 기준
 *   left     : 남은 개수            safe : 적정 개수          perDay : 하루 사용 개수
 *   daysLeft : 소진까지 남은 날(소수) expiryDays : 가장 빠른 소비기한까지 남은 날
 */
export function stockInfo(item) {
  const today = TODAY.getTime()
  const daysTo = (iso) => Math.round((new Date(`${iso}T00:00:00`) - today) / DAY)
  const all = (item.lots ?? []).filter((lot) => lot.qty > 0)
  // 소비기한이 지난 입고분은 남은 양에서 빼고 따로 센다 (쓸 수 없는 재고를 '있다'고 보여 주지 않게)
  const expiredLots = all.filter(isExpiredLot)
  const lots = all.filter((lot) => !expiredLots.includes(lot))
  const size = item.packSize || 1
  const left = lots.reduce((sum, lot) => sum + lot.qty, 0)
  const expired = expiredLots.reduce((sum, lot) => sum + lot.qty, 0)
  const safe = item.safeStock ? item.safeStock / size : null
  const perDay = item.dailyUse ? item.dailyUse / size : null
  const daysLeft = perDay ? left / perDay : null
  const expiring = lots.filter((lot) => lot.expiresAt).sort((a, b) => a.expiresAt.localeCompare(b.expiresAt))[0]
  const expiryDays = expiring ? daysTo(expiring.expiresAt) : null
  // 기한 전까지 다 못 쓰고 남을 양 (먼저 들어온 것부터 쓴다고 가정)
  const waste = expiring && perDay != null ? Math.max(0, Math.round((expiring.qty - perDay * expiryDays) * 10) / 10) : 0

  // 이미 발주해서 오는 중이면 부족보다 '입고 예정'을 먼저 보여 준다 (같은 품목 두 번 주문 방지)
  const state = item.incoming
    ? 'incoming'
    : daysLeft != null && daysLeft <= LOW_DAYS
      ? 'low'
      : expired > 0 || (expiryDays != null && expiryDays <= EXPIRY_DAYS)
        ? 'expiring'
        : 'ok'
  return { left, safe, perDay, daysLeft, expiryDays, expiringLot: expiring, expired, waste, state }
}

/** 급한 것부터 — 부족 → 임박 → 입고 예정 → 여유, 같은 상태면 빨리 떨어지는 순 */
export const byUrgency = (a, b) =>
  STATES[a.info.state].order - STATES[b.info.state].order || (a.info.daysLeft ?? 999) - (b.info.daysLeft ?? 999)

/** 소진 시점 — 내일 오전 · 3일 뒤 */
export function emptyText(daysLeft) {
  if (daysLeft == null) return ''
  const day = Math.floor(daysLeft)
  if (day <= 1) {
    const hour = 9 + Math.round((daysLeft - day) * 12) // 가정: 하루 사용량을 영업시간 9~21시(12시간)에 고르게 쓴다
    return `${dayText(day)} ${hour < 12 ? '오전' : '오후'} 소진`
  }
  return `${day}일 뒤 소진`
}

/** ③ 언제 · 왜 — 부족 · 임박 카드에만 (점진적 공개) */
export function reasonText(info) {
  if (info.state === 'low') return `${emptyText(info.daysLeft)} · 하루 ${qtyText(Math.round(info.perDay * 10) / 10)} 사용`
  if (info.state === 'expiring') {
    if (info.expired) return `소비기한 지난 ${qtyText(info.expired)} · 폐기 등록이 필요해요`
    const when = `소비기한 ${dayText(info.expiryDays)}까지`
    return info.waste > 0 ? `${when} · ${qtyText(info.waste)} 남을 수 있어요` : `${when} · 기한 안에 다 쓸 수 있어요`
  }
  return ''
}

/** 입고 예정 문장 — 오늘 · 내일 N개 도착 예정 */
export const incomingText = (incoming) => `${dayText(incoming.arriveDays)} ${qtyText(incoming.qty)} 도착 예정`
