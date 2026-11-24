import { Link } from 'react-router-dom'
import AuthLayout from '@/components/auth/AuthLayout'
import AuthButton from '@/components/auth/AuthButton'

export default function FindPasswordPage() {
  return (
    <AuthLayout title="비밀번호 찾기" description="비밀번호 찾기·재설정은 다음 구현 단계에서 제공할 예정이에요.">
      <p className="text-label text-ink-sub">현재 화면에서는 비밀번호를 조회하거나 변경하지 않아요. 휴대전화 인증과 재설정 API가 연결되면 이 경로에서 이어서 이용할 수 있어요.</p>
      <AuthButton asChild><Link to="/login">로그인으로 돌아가기</Link></AuthButton>
    </AuthLayout>
  )
}
