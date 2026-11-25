import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { endPromotion, getPromotions } from '@/api/coupon'
import { useStoreSelection } from '@/store/useStoreSelection'
import * as mock from './mock'

// TODO 서버 API가 생기면 queryFn 을 api.js 함수로 바꾼다 (화면 코드는 그대로)
//   예) queryFn: () => getInventory(storeId)
// queryKey 에 storeId 를 넣어 매장별로 캐시를 나눈다 (useStoreSelection 주석 참고)
const useMockQuery = (key, data) => {
  const storeId = useStoreSelection((s) => s.storeId)
  return useQuery({ queryKey: [...key, storeId], queryFn: async () => data, initialData: data })
}

export const usePromotion = () => useMockQuery(['coupon', 'promotion'], mock.promotion)

const promotionsKey = (storeId) => ['coupon', 'promotions', storeId]

export const usePromotions = () => {
  const storeId = useStoreSelection((s) => s.storeId)
  return useQuery({ queryKey: promotionsKey(storeId), queryFn: () => getPromotions(storeId) })
}

/** 운영 종료 — 끝나면 프로모션 목록과 홈 캘린더를 다시 불러온다 */
export const useEndPromotion = () => {
  const storeId = useStoreSelection((s) => s.storeId)
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (promotionId) => endPromotion(storeId, promotionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: promotionsKey(storeId) })
      queryClient.invalidateQueries({ queryKey: ['home', 'events', storeId] })
    },
  })
}
