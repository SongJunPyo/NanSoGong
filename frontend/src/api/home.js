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

export async function getHomeEvents() {
  return homeEvents.map((event) => ({ ...event }))
}
