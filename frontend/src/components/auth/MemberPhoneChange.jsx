import { useEffect, useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import * as auth from '@/api/auth'
import { useAuthStore } from '@/store/useAuthStore'
import { myMemberKey } from '@/hooks/useAuthSession'
import { normalizePhone } from '@/utils/auth'
import { Card } from '@/components/common/ui'
import { toast } from '@/components/ui/toast'
import AuthField from './AuthField'
import AuthButton from './AuthButton'

export default function MemberPhoneChange({ available, disabled }) {
  const cache = useQueryClient()
  const [open, setOpen] = useState(false)
  const [phone, setPhone] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [code, setCode] = useState('')
  const [challenge, setChallenge] = useState(null)
  const [proof, setProof] = useState(null)
  const [error, setError] = useState(null)
  const [now, setNow] = useState(Date.now)
  const lock = useRef(false)
  const send = useMutation({ mutationFn: auth.requestPhoneChange, retry: false, gcTime: 0 })
  const verify = useMutation({ mutationFn: auth.confirmPhoneChange, retry: false, gcTime: 0 })
  const save = useMutation({ mutationFn: async (input) => {
    const session = useAuthStore.getState()
    const user = await auth.updatePhone(input)
    return { user, epoch: session.sessionEpoch, memberId: session.user?.memberId }
  }, retry: false, gcTime: 0 })
  const busy = send.isPending || verify.isPending || save.isPending || disabled
  const deadline = proof?.expiresAt ?? challenge?.expiresAt
  const seconds = deadline ? Math.max(0, Math.ceil((deadline - now) / 1000)) : 0
  useEffect(() => {
    if (!deadline) return
    const interval = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(interval)
  }, [deadline])
  function reset() {
    setPhone(''); setCurrentPassword(''); setCode(''); setChallenge(null); setProof(null); setError(null)
    send.reset(); verify.reset(); save.reset()
  }
  async function submit(event) {
    event.preventDefault()
    if (lock.current || busy || !available) return
    const normalized = normalizePhone(phone)
    if (!/^01[016789]\d{7,8}$/.test(normalized)) { setError('새 휴대전화 번호를 확인해 주세요.'); return }
    if (!challenge && !currentPassword) { setError('현재 비밀번호를 입력해 주세요.'); return }
    if (challenge && !seconds) { setError('인증 시간이 만료됐어요. 다시 인증해 주세요.'); return }
    if (challenge && !proof && !/^\d{6}$/.test(code)) { setError('인증번호 6자리를 입력해 주세요.'); return }
    lock.current = true; setError(null)
    try {
      if (!challenge) {
        const result = await send.mutateAsync({ phone: normalized, currentPassword })
        setChallenge(result); setCurrentPassword(''); setCode(''); setNow(Date.now())
      } else if (!proof) {
        const result = await verify.mutateAsync({ challengeId: challenge.challengeId, phone: normalized, code })
        setProof(result); setCode(''); setNow(Date.now())
      } else {
        const result = await save.mutateAsync({ phone: normalized, verificationToken: proof.verificationToken })
        await cache.cancelQueries({ queryKey: myMemberKey(result.memberId), exact: true })
        const current = useAuthStore.getState()
        if (current.sessionEpoch !== result.epoch || current.user?.memberId !== result.memberId) return
        useAuthStore.setState({ user: result.user })
        cache.setQueryData(myMemberKey(result.memberId), result.user)
        toast('휴대전화 번호를 변경했어요.')
        reset(); setOpen(false)
      }
    } catch (failure) { setError(failure.message) }
    finally { lock.current = false }
  }
  return (
    <Card tone="line" pad="p-4" gap="gap-3">
      <button type="button" className="min-h-10 text-left text-body font-bold text-woori-deep disabled:text-ink-mute" disabled={!available || busy} aria-expanded={open} onClick={() => { reset(); setOpen(!open) }}>{open ? '전화번호 변경 취소' : '전화번호 변경'}</button>
      {!available && <p className="text-caption text-ink-sub">SMS 발신번호 등록과 인증 설정이 준비된 후 이용할 수 있어요.</p>}
      {open && <form noValidate onSubmit={submit} className="flex flex-col gap-4 border-t border-line pt-4">
        <p className="text-caption text-ink-sub">현재 비밀번호로 계정을 확인하고 새 번호로 받은 SMS를 인증해요. 통신사 명의·실명 확인은 진행하지 않아요.</p>
        <AuthField name="newPhone" label="새 휴대전화 번호" type="tel" autoComplete="tel" value={phone} disabled={busy || Boolean(challenge)} onChange={event => { setPhone(event.target.value); setError(null) }} />
        {!challenge && <AuthField name="phoneCurrentPassword" label="현재 비밀번호" type="password" autoComplete="current-password" value={currentPassword} disabled={busy} onChange={event => { setCurrentPassword(event.target.value); setError(null) }} />}
        {challenge && !proof && <><p role="status" className="text-caption text-ink-sub">발송 요청을 접수했어요. 새 번호로 수신한 인증번호를 입력해 주세요.</p><AuthField name="phoneCode" label="인증번호" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} disabled={busy || !seconds} onChange={event => { setCode(event.target.value); setError(null) }} /></>}
        {proof && <p role="status" className="text-label text-success">SMS 인증을 확인했어요. 아래 버튼을 눌러 새 번호를 저장해 주세요.</p>}
        {deadline && <p className={`text-caption ${seconds ? 'text-ink-sub' : 'text-danger'}`}>{seconds ? `남은 시간 ${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}` : '인증 시간이 만료됐어요. 다시 인증해 주세요.'}</p>}
        {error && <p role="alert" className="text-label text-danger">{error}</p>}
        <AuthButton type="submit" busy={busy} disabled={Boolean(challenge) && !seconds}>{busy ? '처리 중…' : proof ? '새 전화번호 저장' : challenge ? '인증번호 확인' : '새 번호로 인증 요청'}</AuthButton>
        {challenge && <AuthButton type="button" variant="outline" disabled={busy} onClick={reset}>다시 인증</AuthButton>}
      </form>}
    </Card>
  )
}
