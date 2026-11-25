import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getInventory, saveInventoryItem } from '@/api/inventory'
import { useStoreSelection } from '@/store/useStoreSelection'
import * as mock from './mock'

// queryKey 에 storeId 를 넣어 매장별로 캐시를 나눈다 (useStoreSelection 주석 참고)
// 처음 그릴 때는 목업 원본을 보여 주고(initialData), 곧바로 api 값으로 다시 맞춘다(initialDataUpdatedAt: 0)
// 품목 이름 수정 등이 화면 사이에 유지되도록 목업 API(api/inventory.js)를 거친다
export const useInventory = () => {
  const storeId = useStoreSelection((s) => s.storeId)
  return useQuery({ queryKey: ['inventory', 'inventory', storeId], queryFn: () => getInventory(storeId), initialData: mock.inventory, initialDataUpdatedAt: 0 })
}

export const useSaveInventoryItem = () => {
  const storeId = useStoreSelection((s) => s.storeId)
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, patch }) => saveInventoryItem(storeId, id, patch),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['inventory', 'inventory', storeId] }),
  })
}
