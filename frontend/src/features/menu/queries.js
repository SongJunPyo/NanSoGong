import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useStoreSelection } from '@/store/useStoreSelection'
import { menuService } from './menuService'
import { analyzeMenuSales } from './menuLogic'

const workspaceKey = (storeId) => ['menu', 'workspace', storeId]

export function useMenuWorkspace() {
  const storeId = useStoreSelection((state) => state.storeId)
  return useQuery({ queryKey: workspaceKey(storeId), queryFn: () => menuService.getWorkspace(storeId), staleTime: 30000 })
}

export function useMenus() {
  const query = useMenuWorkspace()
  return { ...query, data: query.data?.menus ?? [] }
}

export function useMenuActions() {
  const storeId = useStoreSelection((state) => state.storeId)
  const client = useQueryClient()
  return useMutation({
    mutationFn: (action) => menuService.execute(storeId, action),
    onSuccess: ({ workspace }) => client.setQueryData(workspaceKey(storeId), workspace),
  })
}

export function useMenuAnalysis(filters) {
  const storeId = useStoreSelection((state) => state.storeId)
  const workspace = useMenuWorkspace()
  const query = useQuery({
    queryKey: ['menu', 'analysis', storeId, workspace.data?.revision, filters],
    enabled: Boolean(workspace.data),
    queryFn: async () => analyzeMenuSales(workspace.data, filters),
    staleTime: 30000,
  })
  return { ...query, error: workspace.error ?? query.error, isPending: workspace.isPending || query.isPending }
}

export function useMenuRecommendationAction(onStage) {
  const storeId = useStoreSelection((state) => state.storeId)
  const client = useQueryClient()
  return useMutation({
    mutationFn: (kind) => menuService.generateRecommendation(storeId, kind, onStage),
    onSuccess: ({ workspace }) => client.setQueryData(workspaceKey(storeId), workspace),
  })
}
