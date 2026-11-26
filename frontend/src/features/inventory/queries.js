import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { adjustInventoryItem, getInventory, receiveInventoryItem, saveInventoryItem } from '@/api/inventory'
import { useStoreSelection } from '@/store/useStoreSelection'
import * as mock from './mock'

// queryKey 에 storeId 를 넣어 매장별로 캐시를 나눈다 (useStoreSelection 주석 참고)
// 처음 그릴 때는 목업 원본을 보여 주고(initialData), 곧바로 api 값으로 다시 맞춘다(initialDataUpdatedAt: 0)
// 품목 이름 수정 등이 화면 사이에 유지되도록 목업 API(api/inventory.js)를 거친다
export const useInventory = () => {
  const storeId = useStoreSelection((s) => s.storeId)
  return useQuery({ queryKey: ['inventory', 'inventory', storeId], queryFn: () => getInventory(storeId), initialData: mock.inventory, initialDataUpdatedAt: 0 })
}

// 저장 · 입고 · 실사 모두 끝나면 재고 목록을 다시 불러온다
const useInventoryMutation = (fn) => {
  const storeId = useStoreSelection((s) => s.storeId)
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (vars) => fn(storeId, vars),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['inventory', 'inventory', storeId] }),
  })
}

export const useSaveInventoryItem = () => useInventoryMutation((storeId, { id, patch }) => saveInventoryItem(storeId, id, patch))

export const useReceiveInventoryItem = () =>
  useInventoryMutation((storeId, { id, ...lot }) => receiveInventoryItem(storeId, id, lot))

export const useAdjustInventoryItem = () =>
  useInventoryMutation((storeId, { id, counted, countedAt }) => adjustInventoryItem(storeId, id, counted, countedAt))
