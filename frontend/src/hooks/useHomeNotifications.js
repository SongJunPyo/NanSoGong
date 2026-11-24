import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getHomeNotifications, markHomeNotificationsRead } from '@/api/home'
import { useStoreSelection } from '@/store/useStoreSelection'

const notificationKey = (storeId) => ['home', 'notifications', storeId]

export function useHomeNotifications() {
  const storeId = useStoreSelection((state) => state.storeId)
  const queryClient = useQueryClient()
  const query = useQuery({
    queryKey: notificationKey(storeId),
    queryFn: () => getHomeNotifications(storeId),
  })
  const mutation = useMutation({
    mutationFn: ({ storeId, ids }) => markHomeNotificationsRead(storeId, ids),
    onSuccess: (updated, variables) => {
      // 응답을 기다리다 매장을 바꿔도 요청한 매장의 캐시만 갱신한다.
      queryClient.setQueryData(notificationKey(variables.storeId), (current = []) =>
        current.map((notification) => ({
          ...notification,
          read: notification.read || updated.some((item) => item.id === notification.id && item.read),
        })),
      )
    },
  })
  const notifications = query.data ?? []
  const unreadCount = notifications.filter((notification) => !notification.read).length

  return {
    notifications,
    unreadCount,
    isPending: query.isPending,
    isSaving: mutation.isPending,
    error: query.error ?? mutation.error,
    markRead: (id) => mutation.mutate({ storeId, ids: [id] }),
    markAllRead: () => mutation.mutate({ storeId, ids: notifications.filter((item) => !item.read).map((item) => item.id) }),
  }
}
