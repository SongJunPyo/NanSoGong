export const HOME_SEVERITIES = {
  urgent: { label: '긴급', dot: 'bg-danger', text: 'text-danger', filter: 'bg-danger-bg text-danger' },
  warning: { label: '주의', dot: 'bg-amber-500', text: 'text-amber-700', filter: 'bg-warning-bg text-amber-700' },
  normal: { label: '일반', dot: 'bg-success', text: 'text-success', filter: 'bg-success-bg text-success' },
}

// 알림(실행 기록) 결과 표시 — 부분 성공 · 확인 필요는 주황, 성공은 파랑, 완료는 초록
export const HOME_RESULTS = {
  success: { label: '성공', dot: 'bg-woori-blue', text: 'text-woori-blue' },
  done: { label: '완료', dot: 'bg-success', text: 'text-success' },
  partial: { label: '부분 성공', dot: 'bg-amber-500', text: 'text-amber-700' },
  check: { label: '확인 필요', dot: 'bg-amber-500', text: 'text-amber-700' },
}

export const HOME_EVENT_TYPES = {
  delivery: { label: '입고', dot: 'bg-woori-blue' },
  promotion: { label: '프로모션', dot: 'bg-violet-500' },
  event: { label: '지역 행사', dot: 'bg-amber-500' },
  custom: { label: '직접 등록', dot: 'bg-success' },
}

export function sortHomeNotifications(notifications, bySeverity = true) {
  const priority = { urgent: 0, warning: 1, normal: 2 }
  return [...notifications].sort((a, b) =>
    (bySeverity ? priority[a.severity] - priority[b.severity] : 0) ||
    new Date(b.createdAt) - new Date(a.createdAt),
  )
}

/** 알림 패널 순서 — 읽지 않은 긴급 알림만 맨 위에 고정, 나머지는 최근 것이 위 */
export function sortNotificationLog(notifications) {
  const pinned = (item) => (item.severity === 'urgent' && !item.read ? 0 : 1)
  return [...notifications].sort((a, b) => pinned(a) - pinned(b) || new Date(b.createdAt) - new Date(a.createdAt))
}

export function getHomeEventsForDate(events, dateKey) {
  return events.filter((event) => event.startDate <= dateKey && (event.endDate ?? event.startDate) >= dateKey)
}

export function shiftCalendarMonth(dateKey, offset) {
  const [year, month] = dateKey.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1 + offset, 1)).toISOString().slice(0, 10)
}

export function getCalendarDays(monthKey) {
  const [year, month] = monthKey.split('-').map(Number)
  const firstWeekday = new Date(Date.UTC(year, month - 1, 1)).getUTCDay()
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate()
  const cellCount = Math.max(35, Math.ceil((firstWeekday + daysInMonth) / 7) * 7)
  return Array.from({ length: cellCount }, (_, index) =>
    new Date(Date.UTC(year, month - 1, 1 - firstWeekday + index)).toISOString().slice(0, 10),
  )
}
