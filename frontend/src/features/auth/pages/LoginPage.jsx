import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import AuthLayout from '@/components/auth/AuthLayout'
import AuthField from '@/components/auth/AuthField'
import AuthButton from '@/components/auth/AuthButton'
import { useLogin, useMyStores } from '@/hooks/useAuthSession'
import { useAuthStore } from '@/store/useAuthStore'
import { loginDestination } from '@/utils/auth'
import { useSignupStore } from '@/store/useSignupStore'
import { useSessionRestore } from '@/hooks/useSessionRestore'

export default function LoginPage() {
  const location = useLocation()
  const [loginId, setLoginId] = useState(() => location.state?.loginId ?? '')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState({})
  const login = useLogin()
  const restoration = useSessionRestore()
  const user = useAuthStore(state => state.user)
  const stores = useMyStores()
  const navigate = useNavigate()
  useEffect(() => {
    if (restoration.ready && user && stores.data) navigate(loginDestination(stores.data), { replace: true })
  }, [restoration.ready, user, stores.data, navigate])
  const [rememberMe, setRememberMe] = useState(false)
  function submit(event) {
    event.preventDefault()
    const next = {}
    if (!loginId.trim()) next.loginId = '아이디를 입력해 주세요.'
    if (!password) next.password = '비밀번호를 입력해 주세요.'
    setErrors(next)
    if (!Object.keys(next).length) login.submit({ loginId: loginId.trim(), password, rememberMe })
  }
  return (
    <AuthLayout title="로그인" description="사장님의 매장 운영을 이어서 확인하세요.">
      {!restoration.ready && !restoration.error && <p role="status" className="text-caption text-ink-sub">이전 로그인 상태를 확인하고 있어요.</p>}
      {restoration.error && <div><p role="alert" className="text-caption text-danger">{restoration.error.message}</p><button type="button" onClick={restoration.retry} className="min-h-10 text-label text-woori-deep">다시 연결하기</button></div>}
      {location.state?.passwordReset && <p role="status" className="text-label text-success">비밀번호를 변경했어요. 새 비밀번호로 로그인해 주세요.</p>}
      <form noValidate onSubmit={submit} className="space-y-4">
        <AuthField label="아이디" name="loginId" autoComplete="username" value={loginId} disabled={login.pending} onChange={(event) => { setLoginId(event.target.value); setErrors({}); login.clearError() }} error={errors.loginId} placeholder="아이디를 입력하세요" />
        <AuthField label="비밀번호" name="password" type="password" autoComplete="current-password" value={password} disabled={login.pending} onChange={(event) => { setPassword(event.target.value); setErrors({}); login.clearError() }} error={errors.password} placeholder="비밀번호를 입력하세요" />
        <label className="flex items-center gap-2 text-caption text-ink-sub"><input type="checkbox" checked={rememberMe} disabled={login.pending} onChange={event => setRememberMe(event.target.checked)} />로그인 상태 유지</label>
        {login.error && <p role="alert" className="text-label text-danger">{login.error.message}</p>}
        <AuthButton type="submit" busy={login.pending} disabled={!restoration.ready && !restoration.error}>{login.pending ? '로그인 중…' : '로그인'}</AuthButton>
      </form>
      <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-label font-bold text-woori-blue">
        <Link to="/signup" onClick={() => useSignupStore.getState().reset()}>회원가입</Link>
        <Link to="/find-password">비밀번호 찾기</Link>
      </div>
    </AuthLayout>
  )
}
