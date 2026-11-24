import { useQuery } from '@tanstack/react-query'
import { useStoreSelection } from '@/store/useStoreSelection'
import * as mock from './mock'

// TODO 서버 API가 생기면 queryFn 을 api.js 함수로 바꾼다 (화면 코드는 그대로)
//   예) queryFn: () => getInventory(storeId)
// queryKey 에 storeId 를 넣어 매장별로 캐시를 나눈다 (useStoreSelection 주석 참고)
const useMockQuery = (key, data) => {
  const storeId = useStoreSelection((s) => s.storeId)
  return useQuery({ queryKey: [...key, storeId], queryFn: async () => data, initialData: data })
}

export const useSalesByDay = () => useMockQuery(['sales', 'salesByDay'], mock.salesByDay)
export const useCashByDay = () => useMockQuery(['sales', 'cashByDay'], mock.cashByDay)
export const useCashTransactions = () => useMockQuery(['sales', 'cashTransactions'], mock.cashTransactions)
export const useCosts = () => useMockQuery(['sales', 'costs'], mock.costs)
export const useSalesSummary = () => useMockQuery(['sales', 'salesSummary'], mock.salesSummary)
export const useMenuSales = () => useMockQuery(['sales', 'menuSales'], mock.menuSales)
