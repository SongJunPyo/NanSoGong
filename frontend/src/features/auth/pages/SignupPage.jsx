import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AuthLayout from '@/components/auth/AuthLayout'
import AuthField from '@/components/auth/AuthField'
import AuthButton from '@/components/auth/AuthButton'
import { useSignupStore } from '@/store/useSignupStore'
import { useAsyncAction } from '@/hooks/useAsyncAction'
import * as auth from '@/api/auth'
import { MOCK_PASSWORD_HINT, normalizePhone, validateMember } from '@/utils/auth'

export default function SignupPage() {
  const draft = useSignupStore()
  const navigate = useNavigate()
  const [errors, setErrors] = useState({})
  const [idMessage, setIdMessage] = useState('')
  const [challenge, setChallenge] = useState(null)
  const [code, setCode] = useState('')
  const [now, setNow] = useState(Date.now)
  const idTask = useAsyncAction(), sendTask = useAsyncAction(), verifyTask = useAsyncAction()
  const busy = idTask.pending || sendTask.pending || verifyTask.pending
  const member = draft.member
  const checked = draft.checkedLoginId === member.loginId
  const phoneVerified = Boolean(draft.phoneProof && draft.phoneProof.phone === normalizePhone(member.phone) && draft.phoneProof.name === member.name.trim() && draft.phoneProof.expiresAt > now)
  const seconds = challenge ? Math.max(0, Math.ceil((challenge.expiresAt - now) / 1000)) : 0
  const validFields = Object.keys(validateMember(member)).length === 0

  useEffect(() => {
    if (!challenge && !draft.phoneProof) return
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [challenge, draft.phoneProof])

  function change(key, value) {
    draft.updateMember(key, value)
    setErrors((previous) => ({ ...previous, [key]: '' }))
    if (key === 'loginId') { setIdMessage(''); idTask.clearError() }
    if (['phone', 'name'].includes(key)) { setChallenge(null); setCode(''); sendTask.clearError(); verifyTask.clearError() }
  }
  function blur(key) { setErrors((previous) => ({ ...previous, [key]: validateMember(useSignupStore.getState().member)[key] })) }
  async function checkId() {
    const error = validateMember(member).loginId
    if (error) { setErrors((previous) => ({ ...previous, loginId: error })); return }
    const result = await idTask.run(() => auth.checkLoginId(member.loginId))
    if (!result) return
    if (result.available) { draft.checkLoginId(result.loginId); setIdMessage('사용할 수 있는 아이디예요.') }
    else setErrors((previous) => ({ ...previous, loginId: '이미 사용 중인 아이디예요.' }))
  }
  async function sendCode() {
    const invalid = validateMember(member)
    if (invalid.name || invalid.phone) { setErrors((previous) => ({ ...previous, name: invalid.name, phone: invalid.phone })); return }
    const result = await sendTask.run(() => auth.requestPhoneCode({ name: member.name, phone: member.phone }))
    if (result) { draft.verifyPhone(null); setChallenge(result); setCode(''); setErrors((previous) => ({ ...previous, phone: '', code: '' })); setNow(Date.now()); verifyTask.clearError() }
  }
  async function verifyCode() {
    if (!/^\d{6}$/.test(code)) { setErrors((previous) => ({ ...previous, code: '인증번호 6자리를 입력해 주세요.' })); return }
    const result = await verifyTask.run(() => auth.verifyPhoneCode({ challengeId: challenge.challengeId, phone: member.phone, name: member.name, code }))
    if (result) { draft.verifyPhone(result); setCode(''); setNow(Date.now()) }
  }
  function next(event) {
    event.preventDefault()
    const invalid = validateMember(member)
    if (!checked) invalid.loginId = '현재 아이디의 중복 확인이 필요해요.'
    if (!phoneVerified || draft.phoneProof.expiresAt <= Date.now()) invalid.phone = '휴대전화 인증을 완료해 주세요.'
    setErrors(invalid)
    if (!Object.keys(invalid).length) navigate('/signup/business')
  }
  return (
    <AuthLayout title="회원정보를 입력해 주세요" description="회원정보와 사업자등록을 모두 마친 후 가입이 완료돼요." step={1}>
      <form noValidate onSubmit={next} className="space-y-4">
        <AuthField label="아이디" name="loginId" autoComplete="username" maxLength={50} value={member.loginId} disabled={busy} onChange={(event) => change('loginId', event.target.value)} onBlur={() => blur('loginId')} error={errors.loginId || idTask.error?.message} hint="개발용 임시 규칙: 영문으로 시작하는 영문·숫자·밑줄 6~50자" right={<AuthButton type="button" variant="outline" busy={idTask.pending} disabled={busy && !idTask.pending} onClick={checkId}>중복 확인</AuthButton>} />
        {checked && idMessage && <p role="status" className="text-caption text-success">{idMessage}</p>}
        <AuthField label="비밀번호" name="password" type="password" autoComplete="new-password" value={member.password} disabled={busy} onChange={(event) => change('password', event.target.value)} onBlur={() => blur('password')} error={errors.password} hint={MOCK_PASSWORD_HINT} />
        <AuthField label="비밀번호 확인" name="passwordConfirm" type="password" autoComplete="new-password" value={member.passwordConfirm} disabled={busy} onChange={(event) => change('passwordConfirm', event.target.value)} onBlur={() => blur('passwordConfirm')} error={errors.passwordConfirm} />
        <AuthField label="이름" name="name" autoComplete="name" maxLength={50} value={member.name} disabled={busy} onChange={(event) => change('name', event.target.value)} onBlur={() => blur('name')} error={errors.name} />
        <AuthField label="휴대전화 번호" name="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="010-1234-5678" value={member.phone} disabled={busy} onChange={(event) => change('phone', event.target.value)} onBlur={() => blur('phone')} error={errors.phone || sendTask.error?.message} right={<AuthButton type="button" variant="outline" busy={sendTask.pending} disabled={busy && !sendTask.pending} onClick={sendCode}>{challenge ? '다시 요청' : '인증 요청'}</AuthButton>} />
        {challenge && !phoneVerified && (
          <div className="space-y-2 rounded-input bg-surface-muted p-3">
            <p className="text-caption text-woori-deep">실제 문자는 발송되지 않아요. 개발용 인증번호는 <strong>000000</strong>이에요.</p>
            <AuthField label="인증번호" name="verificationCode" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} disabled={busy} onChange={(event) => { setCode(event.target.value); setErrors((previous) => ({ ...previous, code: '' })); verifyTask.clearError() }} error={errors.code || verifyTask.error?.message} right={<AuthButton type="button" variant="outline" busy={verifyTask.pending} disabled={seconds <= 0 || (busy && !verifyTask.pending)} onClick={verifyCode}>인증 확인</AuthButton>} />
            <p role="status" className={`text-caption ${seconds ? 'text-ink-sub' : 'text-danger'}`}>{seconds ? `남은 시간 ${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}` : '인증 시간이 만료되었어요. 다시 요청해 주세요.'}</p>
          </div>
        )}
        {phoneVerified && <p role="status" className="text-caption font-bold text-success">휴대전화 인증 완료 · 개발용 Mock</p>}
        <AuthButton type="submit" disabled={!validFields || !checked || !phoneVerified || busy}>다음: 사업자등록</AuthButton>
        <p className="text-center text-caption text-ink-sub">이미 계정이 있으신가요? <Link to="/login" className="font-bold text-woori-blue">로그인</Link></p>
      </form>
    </AuthLayout>
  )
}
