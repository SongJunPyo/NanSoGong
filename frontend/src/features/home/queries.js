import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useStoreSelection } from '@/store/useStoreSelection'
import * as mock from './mock'
import { addHomeEvent, getHomeEvents } from '@/api/home'

// TODO 서버 API가 생기면 queryFn 을 api.js 함수로 바꾼다 (화면 코드는 그대로)
//   예) queryFn: () => getInventory(storeId)
// queryKey 에 storeId 를 넣어 매장별로 캐시를 나눈다 (useStoreSelection 주석 참고)
const useMockQuery = (key, data) => {
  const storeId = useStoreSelection((s) => s.storeId)
  return useQuery({ queryKey: [...key, storeId], queryFn: async () => data, initialData: data })
}

export const useHome = () => useMockQuery(['home', 'home'], mock.home)
export const useHomeBriefing = () => useMockQuery(['home', 'briefing'], mock.homeBriefing)
export const useAiSummary = () => useMockQuery(['home', 'aiSummary'], mock.aiSummary)

export const useHomeEvents = () => {
  const storeId = useStoreSelection((state) => state.storeId)
  return useQuery({ queryKey: ['home', 'events', storeId], queryFn: () => getHomeEvents(storeId) })
}

/** 캘린더 팝업에서 일정 추가 — 끝나면 캘린더를 다시 불러온다 */
export const useAddHomeEvent = () => {
  const storeId = useStoreSelection((state) => state.storeId)
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input) => addHomeEvent(storeId, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['home', 'events', storeId] }),
  })
}
