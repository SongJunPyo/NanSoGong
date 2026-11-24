import { Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/useAuthStore'

export default function AuthGuard({ children }) {
  const token = useAuthStore((state) => state.accessToken)
  const user = useAuthStore((state) => state.user)
  if (!token || !user) return <Navigate to="/login" replace />
  return children
}
