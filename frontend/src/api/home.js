import { homeEvents, homeNotifications } from '@/features/home/mock'

// 목업에서도 매장마다 읽음 상태를 분리하고, 화면 이동·재조회 때 상태를 유지한다.
// 새로고침하면 초기화된다. 실제 API가 생기면 이 함수들을 request() 호출로 교체한다.
const notificationsByStore = new Map()

function notificationsFor(storeId) {
  if (!notificationsByStore.has(storeId)) {
    notificationsByStore.set(storeId, homeNotifications.map((notification) => ({ ...notification })))
  }
  return notificationsByStore.get(storeId)
}

export async function getHomeNotifications(storeId) {
  return notificationsFor(storeId).map((notification) => ({ ...notification }))
}

export async function markHomeNotificationsRead(storeId, notificationIds) {
  const ids = new Set(notificationIds)
  const updated = notificationsFor(storeId).map((notification) =>
    ids.has(notification.id) ? { ...notification, read: true } : notification,
  )
  notificationsByStore.set(storeId, updated)
  return updated.map((notification) => ({ ...notification }))
}

export async function deleteHomeNotifications(storeId, notificationIds) {
  const ids = new Set(notificationIds)
  const current = notificationsFor(storeId)
  const removed = current.filter((notification) => ids.has(notification.id))
  notificationsByStore.set(storeId, current.filter((notification) => !ids.has(notification.id)))
  return removed.map((notification) => ({ ...notification }))
}

// 삭제 되돌리기 — 지운 알림을 다시 넣는다 (이미 있으면 그대로)
export async function restoreHomeNotifications(storeId, notifications) {
  const current = notificationsFor(storeId)
  const missing = notifications.filter((item) => !current.some((notification) => notification.id === item.id))
  notificationsByStore.set(storeId, [...current, ...missing.map((item) => ({ ...item }))])
  return notificationsFor(storeId).map((notification) => ({ ...notification }))
}

// 운영을 종료한 프로모션처럼 기간이 줄어든 일정 (매장별 · 일정 id → 새 종료일)
const eventEndOverrides = new Map()

export async function getHomeEvents(storeId) {
  const overrides = eventEndOverrides.get(storeId) ?? {}
  return homeEvents.map((event) => ({
    ...event,
    ...(overrides[event.id] ? { endDate: overrides[event.id], description: '운영을 종료한 프로모션' } : {}),
  }))
}

/** 일정 종료일을 앞당긴다 (예: 프로모션 운영 종료) */
export async function endHomeEvent(storeId, eventId, endDate) {
  eventEndOverrides.set(storeId, { ...(eventEndOverrides.get(storeId) ?? {}), [eventId]: endDate })
}
