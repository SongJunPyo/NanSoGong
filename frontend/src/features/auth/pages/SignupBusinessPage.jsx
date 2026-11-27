import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import AuthLayout from '@/components/auth/AuthLayout'
import AuthField from '@/components/auth/AuthField'
import AuthButton from '@/components/auth/AuthButton'
import { useSignupStore } from '@/store/useSignupStore'
import { signup, verifyBusiness } from '@/api/auth'
import { emptyBusiness, formatBusinessNumber, normalizeBusiness, normalizePhone, validateBusiness } from '@/utils/auth'

const RESULTS = {
  ACTIVE: '사업자 정보가 일치하고 영업 중인 사업자로 확인됐어요. 아래 버튼으로 등록 목록에 추가해 주세요.',
  SUSPENDED: '휴업 사업자는 등록할 수 없어요. 사업자 상태를 확인해 주세요.',
  CLOSED: '폐업 사업자는 등록할 수 없어요. 다른 정상 사업자를 등록해 주세요.',
  DUPLICATE: '이미 등록된 사업자등록번호예요. 다른 번호를 확인해 주세요.',
  MISMATCH: '사업자정보를 확인할 수 없어요. 사업자등록번호·대표자명·개업일자가 사업자등록증과 일치하는지 확인해 주세요.',
}

export default function SignupBusinessPage() {
  const draft = useSignupStore()
  const navigate = useNavigate()
  const [form, setForm] = useState(emptyBusiness)
  const [errors, setErrors] = useState({})
  const [editing, setEditing] = useState(null)
  const [notice, setNotice] = useState('')
  // 가입 전 조회라 storeId가 없다. 조회 결과는 화면을 벗어나면 캐시에 남기지 않는다.
  const verifyTask = useMutation({ mutationKey: ['auth', 'business-verification'], mutationFn: verifyBusiness, retry: false, gcTime: 0 })
  const signupTask = useMutation({ mutationKey: ['auth', 'signup'], mutationFn: signup, retry: false, gcTime: 0 })
  const result = verifyTask.data
  const busy = verifyTask.isPending || signupTask.isPending
  const hasDraft = Object.values(form).some(Boolean)
  if (draft.completed) return <Navigate to="/signup/complete" replace />
  if (!draft.member.loginId || !draft.phoneProof || draft.checkedLoginId !== draft.member.loginId) return <Navigate to="/signup" replace />

  function change(key, value) {
    setForm((previous) => ({ ...previous, [key]: value }))
    setErrors((previous) => ({ ...previous, [key]: '' }))
    setNotice('')
    verifyTask.reset()
  }
  function resetForm() { setForm(emptyBusiness()); setEditing(null); setErrors({}); verifyTask.reset() }
  function verify() {
    if (busy) return
    const invalid = validateBusiness(form)
    const number = normalizeBusiness(form).bizRegNo
    if (draft.businesses.some((item, index) => index !== editing && item.bizRegNo === number)) invalid.bizRegNo = '이미 등록 목록에 추가한 사업자예요.'
    setErrors(invalid)
    verifyTask.reset()
    if (Object.keys(invalid).length) return
    verifyTask.mutate(normalizeBusiness(form))
  }
  function addBusiness() {
    if (result?.status !== 'ACTIVE') return
    const value = normalizeBusiness(form)
    if (draft.businesses.some((item, index) => index !== editing && item.bizRegNo === value.bizRegNo)) { setErrors({ bizRegNo: '이미 등록한 사업자예요.' }); return }
    const entries = [...draft.businesses]
    if (editing === null) entries.push(value)
    else entries[editing] = value
    draft.setBusinesses(entries)
    resetForm()
    setNotice(editing === null ? '진위·영업 상태를 확인한 사업자를 등록 목록에 추가했어요.' : '다시 확인한 사업자정보를 수정했어요.')
  }
  function editBusiness(index) {
    const value = draft.businesses[index]
    setForm({ bizRegNo: formatBusinessNumber(value.bizRegNo), ownerName: value.ownerName, openingDate: value.openingDate, bizName: value.bizName })
    setEditing(index); setErrors({}); setNotice('수정할 정보는 다시 사업자 확인을 해 주세요.')
    verifyTask.reset()
  }
  function deleteBusiness(index) {
    draft.setBusinesses(draft.businesses.filter((_, itemIndex) => itemIndex !== index))
    if (index === editing) resetForm()
    else if (editing !== null && index < editing) setEditing(editing - 1)
    setNotice('사업자정보를 목록에서 삭제했어요.')
  }
  function finish(event) {
    event.preventDefault()
    if (!draft.businesses.length || hasDraft || editing !== null || busy) return
    const member = draft.member
    signupTask.mutate({ loginId: member.loginId, password: member.password, name: member.name, phone: normalizePhone(member.phone), phoneVerificationToken: draft.phoneProof.verificationToken, stores: draft.businesses }, {
      onSuccess: (completed) => { draft.finish(completed); navigate('/signup/complete', { replace: true }) },
    })
  }

  return (
    <AuthLayout title="사업자정보를 등록해 주세요" description="영업 중인 사업자정보를 최소 1개 등록해야 회원가입을 완료할 수 있어요." step={2}>
      <form noValidate onSubmit={(event) => { event.preventDefault(); verify() }} className="space-y-4">
        <p className="text-caption leading-relaxed text-ink-sub">사업자등록번호·대표자명·개업일자의 일치 여부와 영업 상태를 함께 확인해요.</p>
        <AuthField label="사업자등록번호" name="bizRegNo" inputMode="numeric" placeholder="123-45-67890" maxLength={12} value={form.bizRegNo} disabled={busy} onChange={(event) => change('bizRegNo', formatBusinessNumber(event.target.value))} error={errors.bizRegNo} />
        <AuthField label="대표자명" name="ownerName" autoComplete="name" maxLength={50} value={form.ownerName} disabled={busy} onChange={(event) => change('ownerName', event.target.value)} error={errors.ownerName} />
        <AuthField label="개업일자" name="openingDate" inputMode="numeric" placeholder="YYYYMMDD · 예: 20260101" maxLength={8} value={form.openingDate} disabled={busy} onChange={(event) => change('openingDate', event.target.value)} error={errors.openingDate} hint="사업자등록증에 적힌 개업일자를 입력해 주세요." />
        <AuthField label="상호 (선택)" name="bizName" autoComplete="organization" maxLength={100} value={form.bizName} disabled={busy} onChange={(event) => change('bizName', event.target.value)} error={errors.bizName} hint="입력한 상호는 첫 매장 설정의 매장명 기본값으로 사용해요." />
        <AuthButton type="submit" variant="outline" busy={verifyTask.isPending} disabled={signupTask.isPending}>{verifyTask.isPending ? '사업자 진위확인 중…' : verifyTask.error ? '사업자 확인 재시도' : '사업자 확인'}</AuthButton>
        {verifyTask.error && <p role="alert" className="text-label text-danger">{verifyTask.error.message}</p>}
        {result && <p role="status" className={`rounded-input p-3 text-label ${result.status === 'ACTIVE' ? 'bg-success-bg text-success' : 'bg-warning-bg text-amber-800'}`}>{RESULTS[result.status] ?? '확인 결과를 해석하지 못했어요. 다시 확인해 주세요.'}</p>}
        {result?.status === 'ACTIVE' && <AuthButton type="button" onClick={addBusiness} disabled={busy}>{editing === null ? '등록 목록에 추가' : '확인한 정보 저장'}</AuthButton>}
        {(hasDraft || editing !== null) && <button type="button" onClick={resetForm} disabled={busy} className="text-caption font-bold text-ink-sub underline">입력 취소</button>}
      </form>

      <section aria-label="등록한 사업자" className="space-y-3 border-t border-line pt-4">
        <div className="flex flex-wrap items-center gap-2"><h2 className="text-base font-bold text-ink">등록한 사업자 {draft.businesses.length}개</h2>{draft.businesses.length > 0 && <button type="button" onClick={resetForm} disabled={busy} className="ml-auto text-caption font-bold text-woori-blue">+ 사업자 추가</button>}</div>
        {!draft.businesses.length ? <p className="text-label text-ink-sub">아직 등록한 사업자가 없어요.</p> : (
          <ul className="space-y-2">{draft.businesses.map((business, index) => (
            <li key={business.bizRegNo} className={`rounded-input border p-3 ${index === editing ? 'border-woori-blue' : 'border-line'}`}>
              <p className="text-label font-bold text-ink">{business.bizName || '상호 미입력'} <span className="text-caption text-success">진위·영업 상태 확인됨</span></p>
              <p className="mt-1 text-caption text-ink-sub">{formatBusinessNumber(business.bizRegNo)} · {business.ownerName} · {business.openingDate}</p>
              <div className="mt-2 flex gap-4 text-caption font-bold"><button type="button" disabled={busy} onClick={() => editBusiness(index)} className="text-woori-blue">수정</button><button type="button" disabled={busy} onClick={() => deleteBusiness(index)} className="text-danger">삭제</button></div>
            </li>
          ))}</ul>
        )}
        {notice && <p role="status" className="text-caption text-woori-deep">{notice}</p>}
      </section>
      <form onSubmit={finish} className="space-y-3">
        {signupTask.error && <p role="alert" className="text-label text-danger">{signupTask.error.message}</p>}
        {hasDraft && draft.businesses.length > 0 && <p className="text-caption text-ink-sub">입력 중인 사업자를 목록에 추가하거나 입력을 취소해 주세요.</p>}
        <AuthButton type="submit" busy={signupTask.isPending} disabled={!draft.businesses.length || hasDraft || editing !== null || verifyTask.isPending}>{signupTask.isPending ? '가입 처리 중…' : '회원가입 완료'}</AuthButton>
        <Link to="/signup" className="block text-center text-caption font-bold text-woori-blue">회원정보로 돌아가기</Link>
      </form>
    </AuthLayout>
  )
}
