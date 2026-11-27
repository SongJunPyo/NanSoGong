import { Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/useAuthStore'
import { useSessionRestore } from '@/hooks/useSessionRestore'

export default function AuthGuard({ children }) {
  const restoration = useSessionRestore()
  const token = useAuthStore((state) => state.accessToken)
  const user = useAuthStore((state) => state.user)
  if (!restoration.ready && restoration.error) return <main className="p-6"><p role="alert" className="text-label text-danger">{restoration.error.message}</p><button type="button" onClick={restoration.retry} className="min-h-11 text-label font-bold text-woori-deep">다시 연결하기</button><button type="button" onClick={() => useAuthStore.getState().logout()} className="ml-4 min-h-11 text-label">로그인 화면으로</button></main>
  if (!restoration.ready) return <main role="status" className="p-6 text-label text-ink-sub">로그인 상태를 확인하고 있어요.</main>
  if (!token || !user) return <Navigate to="/login" replace />
  return children
}
