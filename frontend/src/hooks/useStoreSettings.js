import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getStore, updateStoreBasics } from '@/api/store'
import { myStoresKey } from '@/hooks/useAuthSession'
import { useAuthStore } from '@/store/useAuthStore'
import { useStoreSelection } from '@/store/useStoreSelection'

const detailKey = (memberId, storeId, epoch) => ['store', 'detail', memberId, storeId, epoch]
const sameSession = ({ memberId, epoch }) => {
  const current = useAuthStore.getState()
  return current.user?.memberId === memberId && current.sessionEpoch === epoch
}

export function useStoreDetails(storeId) {
  const memberId = useAuthStore((state) => state.user?.memberId)
  const epoch = useAuthStore((state) => state.sessionEpoch)
  return useQuery({
    queryKey: detailKey(memberId, storeId, epoch), enabled: Boolean(memberId && storeId),
    queryFn: ({ signal }) => getStore(storeId, { signal }), retry: false,
  })
}

export function useUpdateStoreSettings() {
  const cache = useQueryClient()
  return useMutation({
    mutationKey: ['store', 'update-settings'], retry: false, gcTime: 0,
    mutationFn: async ({ storeId, input }) => {
      const session = useAuthStore.getState()
      if (!session.user || useStoreSelection.getState().storeId !== storeId) throw new Error('선택한 매장이 바뀌었어요. 현재 매장정보를 다시 확인해 주세요.')
      const context = { memberId: session.user.memberId, epoch: session.sessionEpoch, storeId }
      const store = await updateStoreBasics(storeId, input)
      return { ...context, store }
    },
    onSuccess: async (result) => {
      if (!sameSession(result)) return
      const listKey = myStoresKey(result.memberId)
      const storeKey = detailKey(result.memberId, result.storeId, result.epoch)
      await Promise.all([
        cache.cancelQueries({ queryKey: listKey, exact: true }),
        cache.cancelQueries({ queryKey: storeKey, exact: true }),
      ])
      if (!sameSession(result)) return
      cache.setQueryData(storeKey, result.store)
      cache.setQueryData(listKey, (stores) => stores?.map((store) => store.storeId === result.storeId ? result.store : store))
      // 전체 내 매장 목록은 보존하고 서버와 다시 맞춘다. 현재 선택한 다른 매장의 폼은 바꾸지 않는다.
      void cache.invalidateQueries({ queryKey: listKey, exact: true })
    },
  })
}
