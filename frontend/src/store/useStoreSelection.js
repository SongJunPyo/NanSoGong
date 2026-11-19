// 🏪 지금 보고 있는 매장 (구현-1-6: 매장이 2개 이상이면 전환, 모든 화면은 선택한 매장 기준, 마지막 선택 매장 기억)
// 매장 ID 는 비밀이 아니므로 localStorage 에 기억해 둔다 (로그인 토큰은 여기 두지 않는다)
// 🚨 매장을 바꾸면 TanStack Query 캐시도 매장별로 갈라야 한다 → queryKey 에 storeId 를 꼭 넣는다
//    예) useQuery({ queryKey: ['inventory', storeId], queryFn: () => getInventory(storeId) })
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useStoreSelection = create(
  persist(
    (set) => ({
      storeId: null,
      selectStore: (storeId) => set({ storeId }),
      clear: () => set({ storeId: null }),
    }),
    { name: 'nansogong-selected-store' },
  ),
)
