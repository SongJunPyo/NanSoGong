import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { confirmDelivery, getDeliveries, getOrders } from '@/api/purchase'
import { useStoreSelection } from '@/store/useStoreSelection'
import * as mock from './mock'

// TODO 서버 API가 생기면 queryFn 을 api.js 함수로 바꾼다 (화면 코드는 그대로)
//   예) queryFn: () => getInventory(storeId)
// queryKey 에 storeId 를 넣어 매장별로 캐시를 나눈다 (useStoreSelection 주석 참고)
const useMockQuery = (key, data) => {
  const storeId = useStoreSelection((s) => s.storeId)
  return useQuery({ queryKey: [...key, storeId], queryFn: async () => data, initialData: data })
}

export const useOrderRecommendation = () => useMockQuery(['purchase', 'orderRecommendation'], mock.orderRecommendation)
// 발주 목록 · 입고는 화면 사이에 바뀌므로(입고 확정 → 상태 변경) 목업 API(api/purchase.js)를 거친다
export const useOrders = () => {
  const storeId = useStoreSelection((s) => s.storeId)
  return useQuery({ queryKey: ['purchase', 'orders', storeId], queryFn: () => getOrders(storeId), initialData: mock.orders, initialDataUpdatedAt: 0 })
}

/** 오늘 도착해서 아직 다 확인하지 않은 입고 줄 */
export const useDeliveries = () => {
  const storeId = useStoreSelection((s) => s.storeId)
  return useQuery({ queryKey: ['purchase', 'deliveries', storeId], queryFn: () => getDeliveries(storeId) })
}

/** 입고 확정 — 끝나면 재고 · 발주 목록 · 입고 줄을 다시 불러온다 */
export const useConfirmDelivery = () => {
  const storeId = useStoreSelection((s) => s.storeId)
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ requestId, lines }) => confirmDelivery(storeId, requestId, lines),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory', 'inventory', storeId] })
      queryClient.invalidateQueries({ queryKey: ['purchase', 'orders', storeId] })
      queryClient.invalidateQueries({ queryKey: ['purchase', 'deliveries', storeId] })
    },
  })
}
export const usePriceCompare = (itemId) =>
  useMockQuery(['purchase', 'priceCompare', itemId], mock.priceCompare[itemId] ?? null)
export const useAgentOrderSettings = () => useMockQuery(['purchase', 'agentOrderSettings'], mock.agentOrderSettings)
export const useAgentOrder = () => useMockQuery(['purchase', 'agentOrder'], mock.agentOrder)
