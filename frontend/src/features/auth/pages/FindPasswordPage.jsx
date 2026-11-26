import { useEffect, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import AuthLayout from '@/components/auth/AuthLayout'
import AuthButton from '@/components/auth/AuthButton'
import AuthField from '@/components/auth/AuthField'
import { requestPasswordReset, verifyPasswordReset, resetPassword, logout } from '@/api/auth'
import { normalizePhone, PASSWORD_HINT, validatePasswordFields } from '@/utils/auth'
import { useAuthStore } from '@/store/useAuthStore'
import { useSignupStore } from '@/store/useSignupStore'
import { useStoreSelection } from '@/store/useStoreSelection'
import { useAuthCapabilities } from '@/hooks/useAuthCapabilities'

export default function FindPasswordPage() {
  const [form, setForm] = useState({ loginId: '', phone: '' })
  const [challenge, setChallenge] = useState(null)
  const [proof, setProof] = useState(null)
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [errors, setErrors] = useState({})
  const [now, setNow] = useState(Date.now)
  const requestTask = useMutation({ mutationFn: requestPasswordReset, retry: false, gcTime: 0 })
  const confirmTask = useMutation({ mutationFn: verifyPasswordReset, retry: false, gcTime: 0 })
  const resetTask = useMutation({ mutationFn: resetPassword, retry: false, gcTime: 0 })
  const busy = requestTask.isPending || confirmTask.isPending || resetTask.isPending
  const navigate = useNavigate()
  const cache = useQueryClient()
  const capabilities = useAuthCapabilities()
  const mockMode = capabilities.data?.verificationMode === 'MOCK'
  const deadline = proof?.expiresAt ?? challenge?.expiresAt
  const seconds = deadline ? Math.max(0, Math.ceil((deadline - now) / 1000)) : 0
  useEffect(() => {
    if (!deadline) return
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [deadline])

  function startOver() {
    setChallenge(null); setProof(null); setCode(''); setPassword(''); setPasswordConfirm(''); setErrors({})
    requestTask.reset(); confirmTask.reset(); resetTask.reset()
  }
  function requestCode(event) {
    event.preventDefault()
    const invalid = {}
    if (!form.loginId.trim() || form.loginId.trim().length > 50) invalid.loginId = '아이디를 입력해 주세요.'
    if (!/^01[016789]\d{7,8}$/.test(normalizePhone(form.phone))) invalid.phone = '가입할 때 등록한 휴대전화 번호를 입력해 주세요.'
    setErrors(invalid)
    if (Object.keys(invalid).length || busy) return
    requestTask.mutate({ loginId: form.loginId.trim(), phone: normalizePhone(form.phone) }, { onSuccess: (result) => {
      setChallenge(result); setCode(''); setNow(Date.now()); confirmTask.reset()
    } })
  }
  function confirmCode(event) {
    event.preventDefault()
    if (!/^\d{6}$/.test(code)) { setErrors({ code: '인증번호 6자리를 입력해 주세요.' }); return }
    if (!seconds || busy) return
    confirmTask.mutate({ challengeId: challenge.challengeId, loginId: form.loginId.trim(), phone: normalizePhone(form.phone), code }, {
      onSuccess: (result) => { setProof(result); setChallenge(null); setCode(''); setErrors({}); setNow(Date.now()) },
    })
  }
  function changePassword(event) {
    event.preventDefault()
    const invalid = validatePasswordFields(password, passwordConfirm)
    setErrors(invalid)
    if (Object.keys(invalid).length || !seconds || busy) return
    const epoch = useAuthStore.getState().sessionEpoch
    resetTask.mutate({ resetToken: proof.resetToken, password, passwordConfirm }, { onSuccess: async () => {
      if (useAuthStore.getState().sessionEpoch !== epoch) return
      try { await logout() } catch { /* 비밀번호 변경으로 이전 자격의 토큰은 이미 차단된다. */ }
      if (useAuthStore.getState().sessionEpoch !== epoch) return
      setProof(null); setPassword(''); setPasswordConfirm('')
      useAuthStore.getState().logout(); useStoreSelection.getState().clear(); useSignupStore.getState().reset(); cache.clear()
      navigate('/login', { replace: true, state: { loginId: form.loginId.trim(), passwordReset: true } })
    } })
  }
  const failure = requestTask.error ?? confirmTask.error ?? resetTask.error
  return (
    <AuthLayout title="비밀번호 재설정" description="가입할 때 등록한 휴대전화 인증 후 새 비밀번호를 설정해요.">
      <p className="rounded-input bg-surface-muted p-3 text-caption text-ink-sub">{mockMode ? '개발용 재설정은 demo-office / 010-0000-9001 등 고정 데모 계정만 가능해요. 인증번호는 000000이며 실제 문자는 발송되지 않아요.' : capabilities.data?.smsReady ? '아이디와 가입한 전화번호가 일치하면 SMS 인증을 진행할 수 있어요.' : 'SMS 인증 설정을 준비 중이에요. 일반 계정 재설정은 실제 문자 인증 연결 후 이용할 수 있어요.'}</p>
      {!challenge && !proof && <form noValidate onSubmit={requestCode} className="space-y-4">
        <AuthField label="아이디" name="loginId" autoComplete="username" maxLength={50} value={form.loginId} disabled={busy} onChange={(event) => { setForm({ ...form, loginId: event.target.value }); setErrors({}); requestTask.reset() }} error={errors.loginId} />
        <AuthField label="가입한 휴대전화 번호" name="phone" type="tel" autoComplete="tel" value={form.phone} disabled={busy} onChange={(event) => { setForm({ ...form, phone: event.target.value }); setErrors({}); requestTask.reset() }} error={errors.phone} />
        <AuthButton type="submit" busy={requestTask.isPending} disabled={capabilities.isPending || capabilities.isError || (!mockMode && !capabilities.data?.smsReady)}>인증번호 요청</AuthButton>
      </form>}
      {challenge && <form noValidate onSubmit={confirmCode} className="space-y-4">
        <p className="text-label text-ink-sub">입력한 정보에 해당하는 재설정 가능 계정이 있으면 인증을 진행할 수 있어요.</p>
        <AuthField label="인증번호" name="code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} disabled={busy || !seconds} onChange={(event) => { setCode(event.target.value); setErrors({}); confirmTask.reset() }} error={errors.code} />
        <AuthButton type="submit" busy={confirmTask.isPending} disabled={!seconds}>인증 확인</AuthButton>
      </form>}
      {proof && <form noValidate onSubmit={changePassword} className="space-y-4">
        <AuthField label="새 비밀번호" name="password" type="password" autoComplete="new-password" value={password} disabled={busy || !seconds} onChange={(event) => { setPassword(event.target.value); setErrors({}); resetTask.reset() }} error={errors.password} hint={PASSWORD_HINT} />
        <AuthField label="새 비밀번호 확인" name="passwordConfirm" type="password" autoComplete="new-password" value={passwordConfirm} disabled={busy || !seconds} onChange={(event) => { setPasswordConfirm(event.target.value); setErrors({}); resetTask.reset() }} error={errors.passwordConfirm} />
        <AuthButton type="submit" busy={resetTask.isPending} disabled={!seconds}>새 비밀번호 저장</AuthButton>
      </form>}
      {deadline && <p role="status" className={`text-caption ${seconds ? 'text-ink-sub' : 'text-danger'}`}>{seconds ? `남은 시간 ${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}` : '인증 시간이 만료됐어요. 처음부터 다시 진행해 주세요.'}</p>}
      {failure && <p role="alert" className="text-label text-danger">{failure.message}</p>}
      {(challenge || proof) && <AuthButton type="button" variant="outline" disabled={busy} onClick={startOver}>처음부터 다시 진행</AuthButton>}
      <Link to="/login" className="text-center text-label font-bold text-woori-blue">로그인으로 돌아가기</Link>
    </AuthLayout>
  )
}
