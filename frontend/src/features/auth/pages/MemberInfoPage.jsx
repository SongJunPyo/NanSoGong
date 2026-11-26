import { useRef, useState } from 'react'
import { Screen } from '@/components/common/layout'
import { Card, Chips } from '@/components/common/ui'
import { SkeletonCard } from '@/components/ui/loading'
import { toast } from '@/components/ui/toast'
import AuthField from '@/components/auth/AuthField'
import AuthButton from '@/components/auth/AuthButton'
import { useMyMember, useUpdateMyMember } from '@/hooks/useAuthSession'
import { useAuthStore } from '@/store/useAuthStore'
import { PASSWORD_HINT, validateMemberUpdate } from '@/utils/auth'

const ACCOUNT_TABS = ['/settings/member', '/settings/store']
const emptyPasswords = () => ({ currentPassword: '', password: '', passwordConfirm: '' })

/** 구현-1-5: JWT 주인의 조회·이름 수정·현재 비밀번호 확인 후 비밀번호 변경. */
export default function MemberInfoPage() {
  const memberId = useAuthStore((state) => state.user?.memberId)
  return <MemberInfoContent key={memberId ?? 'anonymous'} />
}

function MemberInfoContent() {
  const memberQuery = useMyMember()
  const update = useUpdateMyMember()
  const [draftName, setDraftName] = useState(null)
  const [changePassword, setChangePassword] = useState(false)
  const [passwords, setPasswords] = useState(emptyPasswords)
  const [errors, setErrors] = useState({})
  const lock = useRef(false)
  const member = memberQuery.data
  const name = draftName ?? member?.name ?? ''
  const busy = update.isPending

  async function save(event) {
    event.preventDefault()
    if (!member || lock.current) return
    const invalid = validateMemberUpdate({ name, ...passwords }, changePassword)
    setErrors(invalid)
    if (Object.keys(invalid).length) return
    lock.current = true
    try {
      const result = await update.mutateAsync({ name: name.trim(), ...(changePassword ? passwords : {}) })
      const current = useAuthStore.getState()
      if (!changePassword && current.accessToken === result.token && current.user?.memberId === result.memberId) {
        setDraftName(null)
        toast('회원정보를 저장했어요.')
      }
    } catch {
      // 서버의 사용자용 오류 문구를 아래에 표시하고 입력값은 유지한다.
    } finally { lock.current = false }
  }
  function togglePassword() {
    setChangePassword(!changePassword)
    setPasswords(emptyPasswords())
    setErrors({})
    update.reset()
  }
  const setPassword = (key, value) => {
    setPasswords({ ...passwords, [key]: value })
    setErrors({})
    update.reset()
  }

  return (
    <Screen title="회원 정보">
      <Chips items={['회원 정보', '매장 정보']} links={[null, ACCOUNT_TABS[1]]} />
      {memberQuery.isPending ? <SkeletonCard lines={4} /> : <>
        {memberQuery.error && <Card tone="warn"><p role="alert" className="text-label text-danger">{memberQuery.error.message}</p><button type="button" disabled={memberQuery.isFetching} onClick={() => memberQuery.refetch()} className="min-h-10 text-label font-bold text-woori-deep">{memberQuery.isFetching ? '조회 중…' : '다시 불러오기'}</button></Card>}
        {member && <form noValidate onSubmit={save} aria-busy={busy} className="flex flex-col gap-5">
          <AuthField label="아이디" name="loginId" value={member.loginId} readOnly autoComplete="username" hint="아이디는 변경할 수 없어요." />
          <AuthField label="이름" name="name" value={name} disabled={busy} maxLength={50} autoComplete="name" error={errors.name} onChange={(event) => { setDraftName(event.target.value); setErrors({}); update.reset() }} hint="회원 이름을 수정해요. 등록한 사업자 대표자 정보는 바뀌지 않아요." />
          <AuthField label="휴대전화 번호" name="phone" value={member.phone} readOnly type="tel" autoComplete="tel" hint="현재는 조회만 가능해요. 번호 변경은 본인확인과 새 번호 SMS 인증 연결 후 제공해요." />
          <Card tone="line" gap="gap-3" pad="p-4">
            <button type="button" aria-expanded={changePassword} aria-controls="member-password-fields" disabled={busy} onClick={togglePassword} className="min-h-10 text-left text-body font-bold text-woori-deep">{changePassword ? '비밀번호 변경 취소' : '비밀번호 변경'}</button>
            {changePassword && <div id="member-password-fields" className="flex flex-col gap-4 border-t border-line pt-4">
              <p className="text-caption text-ink-sub">현재 비밀번호를 확인해요. 저장하면 기존 로그인이 종료되므로 새 비밀번호로 다시 로그인해 주세요.</p>
              <AuthField label="현재 비밀번호" name="currentPassword" type="password" autoComplete="current-password" value={passwords.currentPassword} disabled={busy} error={errors.currentPassword} onChange={(event) => setPassword('currentPassword', event.target.value)} />
              <AuthField label="새 비밀번호" name="password" type="password" autoComplete="new-password" value={passwords.password} disabled={busy} error={errors.password} hint={PASSWORD_HINT} onChange={(event) => setPassword('password', event.target.value)} />
              <AuthField label="새 비밀번호 확인" name="passwordConfirm" type="password" autoComplete="new-password" value={passwords.passwordConfirm} disabled={busy} error={errors.passwordConfirm} onChange={(event) => setPassword('passwordConfirm', event.target.value)} />
            </div>}
          </Card>
          {update.error && <p role="alert" className="rounded-input bg-danger-bg p-3 text-label text-danger">{update.error.message}</p>}
          <AuthButton type="submit" busy={busy} disabled={memberQuery.isError}>{busy ? '저장 중…' : changePassword ? '회원정보·비밀번호 저장' : '회원정보 저장'}</AuthButton>
        </form>}
      </>}
      <div><button type="button" disabled className="min-h-10 text-label text-ink-mute">회원 탈퇴 (준비 중)</button></div>
    </Screen>
  )
}
