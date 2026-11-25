import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { deleteHomeNotifications, getHomeNotifications, markHomeNotificationsRead, restoreHomeNotifications } from '@/api/home'
import { toast } from '@/components/ui/toast'
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
  // 삭제 — 지운 뒤 [되돌리기] 토스트로 살릴 수 있다
  const removeMutation = useMutation({
    mutationFn: ({ storeId, ids }) => deleteHomeNotifications(storeId, ids),
    onSuccess: (removed, variables) => {
      queryClient.setQueryData(notificationKey(variables.storeId), (current = []) =>
        current.filter((notification) => !variables.ids.includes(notification.id)),
      )
      if (!removed.length) return
      toast(removed.length > 1 ? `알림 ${removed.length}개를 지웠어요` : '알림을 지웠어요', {
        undo: async () => {
          const restored = await restoreHomeNotifications(variables.storeId, removed)
          queryClient.setQueryData(notificationKey(variables.storeId), restored)
        },
      })
    },
  })
  const notifications = query.data ?? []
  const unreadCount = notifications.filter((notification) => !notification.read).length

  return {
    notifications,
    unreadCount,
    isPending: query.isPending,
    isSaving: mutation.isPending || removeMutation.isPending,
    error: query.error ?? mutation.error ?? removeMutation.error,
    markRead: (id) => mutation.mutate({ storeId, ids: [id] }),
    markAllRead: () => mutation.mutate({ storeId, ids: notifications.filter((item) => !item.read).map((item) => item.id) }),
    remove: (id) => removeMutation.mutate({ storeId, ids: [id] }),
    removeRead: () => removeMutation.mutate({ storeId, ids: notifications.filter((item) => item.read).map((item) => item.id) }),
  }
}
