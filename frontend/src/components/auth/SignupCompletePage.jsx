import { Navigate, Link } from 'react-router-dom'
import { CircleCheck } from 'lucide-react'
import { useSignupStore } from '@/store/useSignupStore'
import AuthLayout from './AuthLayout'
import AuthButton from './AuthButton'

export default function SignupCompletePage() {
  const completed = useSignupStore((state) => state.completed)
  if (!completed) return <Navigate to="/signup" replace />
  return (
    <AuthLayout title="회원가입이 완료됐어요" description="등록한 계정으로 로그인하고 매장 기본정보를 설정해 주세요." step={3}>
      <CircleCheck size={44} aria-hidden="true" className="text-success" />
      <dl className="space-y-3 rounded-card bg-woori-tint p-4 text-label">
        <div className="flex justify-between gap-3"><dt className="text-ink-sub">가입한 아이디</dt><dd className="font-bold text-ink">{completed.loginId}</dd></div>
        <div className="flex justify-between gap-3"><dt className="text-ink-sub">등록한 사업자</dt><dd className="font-bold text-ink">{completed.businessCount}개</dd></div>
      </dl>
      <AuthButton asChild><Link to="/login" replace state={{ loginId: completed.loginId }}>로그인하러 가기</Link></AuthButton>
    </AuthLayout>
  )
}
