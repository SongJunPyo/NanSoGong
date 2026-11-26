import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import AuthLayout from '@/components/auth/AuthLayout'
import AuthField from '@/components/auth/AuthField'
import AuthButton from '@/components/auth/AuthButton'
import { useLogin } from '@/hooks/useAuthSession'
import { useSignupStore } from '@/store/useSignupStore'

export default function LoginPage() {
  const location = useLocation()
  const [loginId, setLoginId] = useState(() => location.state?.loginId ?? '')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState({})
  const login = useLogin()
  function submit(event) {
    event.preventDefault()
    const next = {}
    if (!loginId.trim()) next.loginId = '아이디를 입력해 주세요.'
    if (!password) next.password = '비밀번호를 입력해 주세요.'
    setErrors(next)
    if (!Object.keys(next).length) login.submit({ loginId: loginId.trim(), password })
  }
  return (
    <AuthLayout title="로그인" description="사장님의 매장 운영을 이어서 확인하세요.">
      <form noValidate onSubmit={submit} className="space-y-4">
        <AuthField label="아이디" name="loginId" autoComplete="username" value={loginId} disabled={login.pending} onChange={(event) => { setLoginId(event.target.value); setErrors({}); login.clearError() }} error={errors.loginId} placeholder="아이디를 입력하세요" />
        <AuthField label="비밀번호" name="password" type="password" autoComplete="current-password" value={password} disabled={login.pending} onChange={(event) => { setPassword(event.target.value); setErrors({}); login.clearError() }} error={errors.password} placeholder="비밀번호를 입력하세요" />
        <label className="flex items-center gap-2 text-caption text-ink-sub"><input type="checkbox" disabled />로그인 상태 유지 <span>(서버 세션 연동 후 제공)</span></label>
        {login.error && <p role="alert" className="text-label text-danger">{login.error.message}</p>}
        <AuthButton type="submit" busy={login.pending}>{login.pending ? '로그인 중…' : '로그인'}</AuthButton>
      </form>
      <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-label font-bold text-woori-blue">
        <Link to="/signup" onClick={() => useSignupStore.getState().reset()}>회원가입</Link>
        <Link to="/find-password">비밀번호 찾기</Link>
      </div>
    </AuthLayout>
  )
}
