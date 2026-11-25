import { useQuery } from '@tanstack/react-query'
import { useStoreSelection } from '@/store/useStoreSelection'
import * as mock from './mock'
import { getHomeEvents } from '@/api/home'

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
