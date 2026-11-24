import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import AuthLayout from '@/components/auth/AuthLayout'
import AuthField from '@/components/auth/AuthField'
import AuthButton from '@/components/auth/AuthButton'
import { useMyStores, myStoresKey, useLogout } from '@/hooks/useAuthSession'
import { useAsyncAction } from '@/hooks/useAsyncAction'
import { useAuthStore } from '@/store/useAuthStore'
import { useStoreSelection } from '@/store/useStoreSelection'
import { updateStoreBasics } from '@/api/store'
import { firstIncompleteStore, isStoreReady, validateStore, WEEK_DAYS, formatBusinessNumber } from '@/utils/auth'

export default function StoreSetupPage() {
  const query = useMyStores()
  const [selectedId, setSelectedId] = useState(null)
  const [notice, setNotice] = useState('')
  const logout = useLogout()
  const stores = query.data ?? []
  const selected = stores.find((store) => store.storeId === selectedId) ?? firstIncompleteStore(stores) ?? stores[0]
  return (
    <AuthLayout title="매장 기본정보를 설정해 주세요" description="사업자 1개당 매장 1개예요. 기본정보를 저장하면 홈으로 이동하며 POS 연결은 나중에 진행할 수 있어요.">
      {query.isPending ? <p role="status">매장정보를 불러오는 중이에요.</p> : query.error ? <div role="alert" className="space-y-3 text-danger"><p>{query.error.message}</p><AuthButton onClick={() => query.refetch()} variant="outline">다시 불러오기</AuthButton></div> : !stores.length ? <p role="alert" className="text-label text-danger">등록된 매장이 없어요. 사업자 등록 상태를 백엔드 담당자에게 확인해 주세요.</p> : (
        <>
          {stores.length > 1 && <label className="space-y-2 text-label font-bold text-ink">설정할 매장<select aria-label="설정할 매장" className="mt-2 h-11 w-full rounded-input border border-line px-3" value={selected.storeId} onChange={(event) => { setSelectedId(Number(event.target.value)); setNotice('') }}>{stores.map((store) => <option key={store.storeId} value={store.storeId}>{store.name || store.bizName || formatBusinessNumber(store.bizRegNo)} · {isStoreReady(store) ? '설정 완료' : '설정 필요'}</option>)}</select></label>}
          {notice && <p role="status" className="text-label text-success">{notice}</p>}
          <StoreForm key={selected.storeId} store={selected} stores={stores} onNext={(store) => { setSelectedId(store.storeId); setNotice('저장했어요. 다음 매장의 기본정보를 설정해 주세요.') }} />
        </>
      )}
      <AuthButton type="button" variant="ghost" busy={logout.pending} onClick={logout.submit}>로그아웃</AuthButton>
    </AuthLayout>
  )
}

function StoreForm({ store, stores, onNext }) {
  const firstHours = Object.values(store.openHours ?? {})[0] ?? ['', '']
  const [form, setForm] = useState(() => ({ name: store.name || store.bizName || '', category: store.category || '', address: store.address || '', openTime: firstHours[0], closeTime: firstHours[1], closedDays: store.closedDays ?? [] }))
  const [errors, setErrors] = useState({})
  const task = useAsyncAction()
  const cache = useQueryClient()
  const navigate = useNavigate()
  const memberId = useAuthStore((state) => state.user?.memberId)
  function change(key, value) { setForm((previous) => ({ ...previous, [key]: value })); setErrors((previous) => ({ ...previous, [key]: '' })); task.clearError() }
  async function save(event) {
    event.preventDefault()
    const invalid = validateStore(form)
    setErrors(invalid)
    if (Object.keys(invalid).length) return
    const updated = await task.run(() => updateStoreBasics(store.storeId, form))
    if (!updated) return
    const nextStores = stores.map((item) => item.storeId === updated.storeId ? updated : item)
    cache.setQueryData(myStoresKey(memberId), nextStores)
    useStoreSelection.getState().selectStore(updated.storeId)
    const remaining = firstIncompleteStore(nextStores)
    if (remaining) onNext(remaining)
    else navigate('/', { replace: true })
  }
  if (!store) return <Navigate to="/login" replace />
  return (
    <form noValidate onSubmit={save} className="space-y-4">
      <p className="text-caption text-ink-sub">사업자등록번호 {formatBusinessNumber(store.bizRegNo)}</p>
      <AuthField label="매장명" name="storeName" autoComplete="organization" value={form.name} disabled={task.pending} onChange={(event) => change('name', event.target.value)} error={errors.name} />
      <AuthField label="업종" name="category" placeholder="예: 카페, 분식" value={form.category} disabled={task.pending} onChange={(event) => change('category', event.target.value)} error={errors.category} />
      <AuthField label="주소" name="address" autoComplete="street-address" value={form.address} disabled={task.pending} onChange={(event) => change('address', event.target.value)} error={errors.address} />
      <fieldset className="space-y-2"><legend className="text-label font-bold text-ink">영업시간 (선택)</legend><div className="grid grid-cols-1 gap-3 sm:grid-cols-2"><AuthField label="시작 시간" name="openTime" type="time" value={form.openTime} disabled={task.pending} onChange={(event) => change('openTime', event.target.value)} /><AuthField label="마감 시간" name="closeTime" type="time" value={form.closeTime} disabled={task.pending} onChange={(event) => change('closeTime', event.target.value)} /></div><p className="text-caption text-ink-sub">휴무일을 제외한 요일에 같은 시간을 적용해요. 마감이 더 이르면 다음 날 마감이에요.</p>{errors.openHours && <p role="alert" className="text-caption text-danger">{errors.openHours}</p>}</fieldset>
      <fieldset><legend className="mb-2 text-label font-bold text-ink">정기 휴무일 (선택)</legend><div className="flex flex-wrap gap-2">{WEEK_DAYS.map(([value, label]) => <label key={value} className="inline-flex items-center gap-1 rounded-lg bg-surface-muted px-2 py-2 text-caption"><input type="checkbox" value={value} checked={form.closedDays.includes(value)} disabled={task.pending} onChange={(event) => change('closedDays', event.target.checked ? [...form.closedDays, value] : form.closedDays.filter((day) => day !== value))} />{label}</label>)}</div></fieldset>
      {task.error && <p role="alert" className="text-label text-danger">{task.error.message}</p>}
      <AuthButton type="submit" busy={task.pending}>{task.pending ? '저장 중…' : '매장 기본정보 저장'}</AuthButton>
    </form>
  )
}
