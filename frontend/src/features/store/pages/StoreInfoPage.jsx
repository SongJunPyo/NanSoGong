import { useRef, useState } from 'react'
import { Screen } from '@/components/common/layout'
import { Card, Chips } from '@/components/common/ui'
import { SkeletonCard } from '@/components/ui/loading'
import { toast } from '@/components/ui/toast'
import AuthField from '@/components/auth/AuthField'
import AuthButton from '@/components/auth/AuthButton'
import { useMyStores } from '@/hooks/useAuthSession'
import { useStoreDetails, useUpdateStoreSettings } from '@/hooks/useStoreSettings'
import { useAuthStore } from '@/store/useAuthStore'
import { useStoreSelection } from '@/store/useStoreSelection'
import { formatBusinessNumber, validateStore, WEEK_DAYS } from '@/utils/auth'
import { hasUniformStoreHours, storeFormValues } from '@/utils/store'

export default function StoreInfoPage() {
  const memberId = useAuthStore((state) => state.user?.memberId)
  const epoch = useAuthStore((state) => state.sessionEpoch)
  const storeId = useStoreSelection((state) => state.storeId)
  const stores = useMyStores()
  return (
    <Screen title="매장 정보">
      <Chips items={['회원 정보', '매장 정보']} defaultIndex={1} links={['/settings/member', null]} />
      {(stores.data?.length > 1 || (!storeId && stores.data?.length)) ? <label className="flex flex-col gap-2 text-label font-bold text-ink">수정할 매장
        <select aria-label="수정할 매장" value={storeId ?? ''} onChange={(event) => useStoreSelection.getState().selectStore(Number(event.target.value))} className="h-11 w-full min-w-0 rounded-input border border-line bg-surface-muted px-3 text-body outline-none focus:ring-2 focus:ring-woori-blue">
          {!storeId && <option value="" disabled>매장을 선택해 주세요</option>}
          {stores.data.map((store) => <option key={store.storeId} value={store.storeId}>{store.name || store.bizName || '이름 미설정 매장'}</option>)}
        </select>
      </label> : null}
      {!storeId ? <Card tone="line"><p role="status" className="text-label text-ink-sub">선택한 매장이 없어요. 수정할 매장을 먼저 선택해 주세요.</p>{stores.error && <><p role="alert" className="text-label text-danger">{stores.error.message}</p><AuthButton variant="outline" onClick={() => stores.refetch()}>매장 목록 다시 불러오기</AuthButton></>}</Card>
        : <StoreInfoContent key={`${memberId}:${epoch}:${storeId}`} storeId={storeId} />}
    </Screen>
  )
}

function StoreInfoContent({ storeId }) {
  const query = useStoreDetails(storeId)
  if (query.isPending) return <><p role="status" className="text-label text-ink-sub">선택한 매장정보를 불러오는 중이에요.</p><SkeletonCard lines={4} /></>
  const failure = query.error && <Card tone="warn"><p role="alert" className="text-label text-danger">{query.error.message}</p>{query.data && <p className="text-caption text-ink-sub">작성 중인 입력은 유지했어요. 다시 불러온 뒤 저장해 주세요.</p>}<AuthButton variant="outline" busy={query.isFetching} onClick={() => query.refetch()}>다시 불러오기</AuthButton></Card>
  if (query.error && (!query.data || [401, 403].includes(query.error.status))) return failure
  return <>{failure}<StoreInfoForm store={query.data} readFailed={Boolean(query.error)} /></>
}

function StoreInfoForm({ store, readFailed }) {
  const [form, setForm] = useState(() => storeFormValues(store))
  const [errors, setErrors] = useState({})
  const [hoursConfirmed, setHoursConfirmed] = useState(false)
  const [notice, setNotice] = useState('')
  const lock = useRef(false)
  const formRef = useRef(null)
  const update = useUpdateStoreSettings()
  const needsHoursConfirmation = !hasUniformStoreHours(store)
  const busy = update.isPending
  const change = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }))
    setErrors({}); setNotice(''); update.reset()
  }
  async function save(event) {
    event.preventDefault()
    if (lock.current || readFailed) return
    const invalid = validateStore(form)
    if (needsHoursConfirmation && !hoursConfirmed) invalid.hoursConfirmation = '기존 시간표를 확인하고 공통 영업시간 적용에 동의해 주세요.'
    setErrors(invalid)
    if (Object.keys(invalid).length) {
      requestAnimationFrame(() => formRef.current?.querySelector('[aria-invalid="true"]')?.focus())
      return
    }
    lock.current = true; setNotice('')
    try {
      const result = await update.mutateAsync({ storeId: store.storeId, input: { ...form, name: form.name.trim(), category: form.category.trim(), address: form.address.trim() } })
      const current = useAuthStore.getState()
      if (current.sessionEpoch !== result.epoch || current.user?.memberId !== result.memberId || useStoreSelection.getState().storeId !== result.storeId) return
      setForm(storeFormValues(result.store)); setHoursConfirmed(false)
      setNotice('매장정보를 저장했어요. 설정 화면에도 반영했어요.')
      toast('매장정보를 저장했어요.')
    } catch {
      // 서버 오류는 아래에 표시하며 작성 중인 입력은 유지한다.
    } finally { lock.current = false }
  }

  return (
    <form ref={formRef} noValidate onSubmit={save} aria-busy={busy} className="flex min-w-0 flex-col gap-5">
      <div><h2 className="text-h2 font-bold text-ink">선택한 매장의 기본정보</h2><p className="mt-1 text-label text-ink-sub">저장하면 설정 화면의 매장명과 주소도 함께 바뀌어요.</p></div>
      <AuthField label="매장명" name="storeName" required autoComplete="organization" maxLength={100} value={form.name} disabled={busy} onChange={(event) => change('name', event.target.value)} error={errors.name} />
      <AuthField label="업종" name="category" required placeholder="예: 카페, 분식" maxLength={50} value={form.category} disabled={busy} onChange={(event) => change('category', event.target.value)} error={errors.category} />
      <AuthField label="주소" name="address" required autoComplete="street-address" maxLength={255} value={form.address} disabled={busy} onChange={(event) => change('address', event.target.value)} error={errors.address} />
      <Card tone="line" pad="p-4" gap="gap-4">
        <h3 className="text-body font-bold text-ink">사업자 정보</h3>
        <AuthField label="사업자등록번호" name="bizRegNo" value={formatBusinessNumber(store.bizRegNo ?? '')} readOnly hint="등록된 사업자정보예요. 이 화면에서는 변경할 수 없어요." />
        {store.bizName && <AuthField label="사업자등록 상호" name="bizName" value={store.bizName} readOnly />}
      </Card>
      <fieldset className="flex flex-col gap-3"><legend className="mb-2 text-body font-bold text-ink">영업시간 (선택)</legend>
        <div className="grid min-w-0 gap-3 sm:grid-cols-2"><AuthField label="시작 시간" name="openTime" type="time" value={form.openTime} disabled={busy} onChange={(event) => change('openTime', event.target.value)} error={errors.openHours} /><AuthField label="마감 시간" name="closeTime" type="time" value={form.closeTime} disabled={busy} onChange={(event) => change('closeTime', event.target.value)} /></div>
        <p className="text-caption leading-relaxed text-ink-sub">휴무일을 제외한 모든 요일에 같은 시간을 적용해요. 마감이 더 이르면 다음 날 마감이에요. 두 시간을 모두 비우면 영업시간을 미설정으로 저장해요.</p>
        {needsHoursConfirmation && <div className="space-y-3 rounded-input bg-warning-bg p-3">
          <p className="text-label font-bold text-ink">요일별 영업시간이 다르거나 일부 요일만 등록되어 있어요.</p>
          <dl className="space-y-1 text-caption text-ink-sub">{Object.entries(store.openHours ?? {}).map(([day, hours]) => <div key={day} className="flex justify-between gap-2"><dt>{WEEK_DAYS.find(([value]) => value === day)?.[1] ?? day}요일</dt><dd className="num">{hours.join(' – ')}</dd></div>)}</dl>
          <label className="flex min-h-11 items-start gap-2 text-label text-ink"><input type="checkbox" disabled={busy} checked={hoursConfirmed} aria-invalid={Boolean(errors.hoursConfirmation)} aria-describedby={errors.hoursConfirmation ? 'store-hours-confirmation-error' : undefined} onChange={(event) => { setHoursConfirmed(event.target.checked); setErrors({}); setNotice(''); update.reset() }} className="mt-1 accent-woori-deep" /><span>저장 시 위 시간표를 입력한 공통 영업시간과 휴무일로 변경하는 것을 확인했어요.</span></label>
          {errors.hoursConfirmation && <p id="store-hours-confirmation-error" role="alert" className="text-caption text-danger">{errors.hoursConfirmation}</p>}
        </div>}
      </fieldset>
      <fieldset><legend className="mb-2 text-body font-bold text-ink">정기 휴무일 (선택)</legend><div className="flex flex-wrap gap-2">{WEEK_DAYS.map(([day, label]) => <label key={day} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-surface-muted px-3 text-label text-ink"><input type="checkbox" checked={form.closedDays.includes(day)} disabled={busy} onChange={(event) => change('closedDays', event.target.checked ? [...form.closedDays, day] : form.closedDays.filter((value) => value !== day))} className="accent-woori-deep" />{label}</label>)}</div></fieldset>
      {update.error && <p role="alert" className="rounded-input bg-danger-bg p-3 text-label text-danger">{update.error.message}</p>}
      {notice && <p role="status" className="text-label text-woori-deep">{notice}</p>}
      <AuthButton type="submit" busy={busy} disabled={readFailed}>{busy ? '저장 중…' : '매장정보 저장'}</AuthButton>
    </form>
  )
}
