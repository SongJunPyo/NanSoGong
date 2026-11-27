import { useQuery } from '@tanstack/react-query'
import { getCapabilities } from '@/api/auth'

export function useAuthCapabilities() {
  return useQuery({ queryKey: ['auth', 'capabilities'], queryFn: getCapabilities, retry: false })
}
