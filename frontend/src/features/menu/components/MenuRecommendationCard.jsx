import { useRef, useState } from 'react'
import { ArrowRight, Check, Pause, X } from 'lucide-react'
import { Card, H2, Pill } from '@/components/common/ui'
import { ButtonLoading } from '@/components/ui/loading'
import { Modal } from '@/components/ui/modal'
import { toast } from '@/components/ui/toast'
import { useMenuActions, useMenuWorkspace } from '@/features/menu/queries'
import { recipeUnit, RECOMMENDATION_STATUSES, shortDate } from '@/features/menu/menuLogic'
import { won } from '@/lib/format'
import { MenuPriceField, MenuTextField } from './MenuFields'

const kinds = { NEW: '신메뉴 제안', SET: '세트 구성 제안', IMPROVE: '기존 메뉴 개선안' }
const tones = { PENDING: 'deep', APPROVED: 'ok', HELD: 'amber', REJECTED: 'gray', REGISTERED: 'ok' }

export default function MenuRecommendationCard({ recommendation, onApproved }) {
  const action = useMenuActions()
  const [error, setError] = useState('')
  const changeStatus = async (status) => {
    if (action.isPending) return
    setError('')
    try {
      const response = await action.mutateAsync({ type: 'RECOMMENDATION_STATUS', payload: { id: recommendation.id, status } })
      if (status === 'APPROVED') onApproved(response.result)
      else toast(status === 'HELD' ? '추천안을 보류했어요.' : status === 'REJECTED' ? '추천안을 반려했어요.' : '추천안을 다시 검토할 수 있어요.')
    } catch (err) { setError(err.message) }
  }
  const rec = recommendation
  return (
    <div id={rec.id} className="scroll-mt-40">
      <Card tone="line" gap="gap-4" pad="p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-caption font-bold text-woori-blue">{kinds[rec.kind]} · 시연 추천</p><Pill tone={tones[rec.status]}>{RECOMMENDATION_STATUSES[rec.status]}</Pill></div>
        <H2>{rec.name}</H2><p className="text-label text-ink">{rec.reason}</p>
        <div className="rounded-input bg-woori-tint p-4"><h4 className="mb-2 text-caption font-bold text-woori-deep">추천 근거 · {shortDate(rec.period.from)}–{shortDate(rec.period.to)}</h4><ul className="flex flex-col gap-1.5 text-caption text-ink-sub">{rec.evidence.map((evidence) => <li key={evidence}>· {evidence}</li>)}</ul></div>
        {rec.kind === 'NEW' && <>
          <dl className="grid gap-3 sm:grid-cols-2"><div><dt className="text-caption text-ink-sub">예상 판매가 (시연 초안)</dt><dd className="num mt-1 text-xl font-bold text-woori-deep">{won(rec.draft.price)}원</dd></div><div><dt className="text-caption text-ink-sub">추천 운영 기간</dt><dd className="mt-1 text-label font-medium text-ink">{rec.operatingPeriod}</dd></div></dl>
          <p className="text-caption text-ink-sub">참고 트렌드 · {rec.trend.keyword} — {rec.trend.note}</p>
          <div className="flex flex-wrap gap-2">{rec.draft.recipe.map((row, index) => <span key={index} className="rounded-lg bg-surface-muted px-3 py-2 text-caption text-ink">{row.name} {won(row.quantity)}{recipeUnit(row.unit)}</span>)}</div>
        </>}
        {rec.kind === 'SET' && <div className="grid grid-cols-2 gap-3 rounded-input bg-surface-muted p-4"><div><p className="text-caption text-ink-sub">개별 가격 합계</p><p className="num mt-1 text-lg font-bold text-ink">{won(rec.regular)}원</p></div><div><p className="text-caption text-ink-sub">추천 세트 가격</p><p className="num mt-1 text-lg font-bold text-woori-deep">{won(rec.draft.price)}원</p></div><p className="col-span-2 text-caption text-ink-sub">예상 할인 부담 {won(rec.regular - rec.draft.price)}원/세트 · 최종 저장 전에 구성과 가격을 수정할 수 있어요.</p></div>}
        {rec.kind === 'IMPROVE' && <>
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-input bg-surface-muted p-4"><div><p className="mb-1 text-caption text-ink-sub">변경 전</p><p className="text-label font-bold text-ink">{rec.before.name}</p><p className="num mt-1 text-caption text-ink-sub">{won(rec.before.price)}원</p></div><ArrowRight size={18} className="text-woori-blue" aria-hidden="true" /><div><p className="mb-1 text-caption text-ink-sub">개선 초안</p><p className="text-label font-bold text-woori-deep">{rec.draft.name}</p><p className="num mt-1 text-caption text-ink-sub">{won(rec.draft.price)}원</p></div></div>
          <ul className="flex flex-col gap-1 text-caption text-ink-sub">{rec.changes.map((change) => <li key={change}>· {change}</li>)}</ul>
        </>}
        {error && <p role="alert" className="text-caption text-danger">{error}</p>}
        {rec.status === 'PENDING' && <div className="grid grid-cols-3 gap-2"><ButtonLoading loading={action.isPending} loadingText="처리 중..." className="text-label" onClick={() => changeStatus('APPROVED')}><Check size={15} aria-hidden="true" />승인</ButtonLoading><button type="button" disabled={action.isPending} onClick={() => changeStatus('HELD')} className="inline-flex items-center justify-center gap-1 rounded-input border border-line text-label font-bold text-ink"><Pause size={14} aria-hidden="true" />보류</button><button type="button" disabled={action.isPending} onClick={() => changeStatus('REJECTED')} className="inline-flex items-center justify-center gap-1 rounded-input border border-line text-label text-danger"><X size={14} aria-hidden="true" />반려</button></div>}
        {rec.status === 'APPROVED' && <ButtonLoading loading={action.isPending} onClick={() => onApproved(rec)}>승인한 제안 상세 수정</ButtonLoading>}
        {['HELD', 'REJECTED'].includes(rec.status) && <button type="button" disabled={action.isPending} onClick={() => changeStatus('PENDING')} className="min-h-11 rounded-input border border-line text-label font-bold text-woori-deep">다시 검토</button>}
        {rec.status === 'REGISTERED' ? <p className="rounded-input bg-success-bg p-3 text-caption text-success">사용자 확인과 최종 저장을 마쳤어요. 메뉴 관리에서 반영 내용을 볼 수 있어요.</p> : <p className="text-caption text-ink-sub">승인은 초안 채택이에요. 상세 정보를 확인하고 최종 저장해야 앱에 반영돼요.</p>}
      </Card>
    </div>
  )
}

export function MenuSetForm({ recommendation, onSaved, onCancel, onBusyChange }) {
  const { data: workspace } = useMenuWorkspace()
  const [draft, setDraft] = useState(() => structuredClone(recommendation.draft))
  const [confirm, setConfirm] = useState(false)
  const [error, setError] = useState('')
  const [operationId] = useState(() => crypto.randomUUID())
  const action = useMenuActions()
  const lock = useRef(false)
  const menus = workspace.menus.filter((menu) => !menu.deletedAt)
  const regular = menus.filter((menu) => draft.menuIds.includes(menu.id)).reduce((sum, menu) => sum + menu.price, 0)
  const check = (event) => {
    event.preventDefault()
    if (!draft.name.trim() || draft.menuIds.length < 2 || !Number.isSafeInteger(Number(draft.price)) || Number(draft.price) <= 0 || Number(draft.price) > regular) { setError('세트명, 메뉴 2개 이상, 개별 가격 합계 이하의 판매가를 확인해 주세요.'); return }
    setError(''); setConfirm(true)
  }
  const save = async () => {
    if (lock.current) return
    lock.current = true; onBusyChange?.(true); setError('')
    try {
      await action.mutateAsync({ type: 'SAVE_SET', payload: { ...draft, recommendationId: recommendation.id }, operationId })
      setConfirm(false); toast('확인한 세트 구성안을 저장했어요.'); onSaved()
    } catch (err) { setError(err.message) }
    finally { lock.current = false; onBusyChange?.(false) }
  }
  return (
    <form onSubmit={check} noValidate className="flex flex-col gap-4 pb-3">
      <MenuTextField label="세트명" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
      <fieldset><legend className="mb-2 text-caption font-bold text-ink">세트 구성 메뉴</legend><div className="grid max-h-56 gap-2 overflow-y-auto rounded-input border border-line p-3">{menus.map((menu) => <label key={menu.id} className="flex min-h-11 items-center gap-2 text-caption text-ink"><input type="checkbox" checked={draft.menuIds.includes(menu.id)} onChange={() => setDraft({ ...draft, menuIds: draft.menuIds.includes(menu.id) ? draft.menuIds.filter((id) => id !== menu.id) : [...draft.menuIds, menu.id] })} className="accent-woori-deep" />{menu.name}<span className="num ml-auto shrink-0">{won(menu.price)}원</span></label>)}</div></fieldset>
      <MenuPriceField label="세트 가격" value={draft.price} onChange={(price) => setDraft({ ...draft, price })} />
      <div className="rounded-input bg-woori-tint p-4 text-label"><p className="flex justify-between gap-3 text-ink-sub"><span>개별 가격 합계</span><strong className="num text-ink">{won(regular)}원</strong></p><p className="mt-2 flex justify-between gap-3 text-ink-sub"><span>예상 할인 부담</span><strong className="num text-woori-deep">{won(regular - Number(draft.price || 0))}원/세트</strong></p></div>
      <p className="text-caption text-ink-sub">앱의 세트 구성안으로 저장돼요. 기존 POS 메뉴 코드는 합치지 않으며 POS 판매는 자동 시작되지 않아요.</p>
      {error && !confirm && <p role="alert" className="text-caption text-danger">{error}</p>}
      <div className="grid grid-cols-2 gap-2"><button type="button" disabled={action.isPending} onClick={onCancel} className="rounded-input border border-line text-label font-bold text-ink">취소</button><ButtonLoading type="submit" loading={action.isPending}>구성 확인하기</ButtonLoading></div>
      <Modal open={confirm} onOpenChange={setConfirm} title="세트 구성 확인" description={draft.name + ' · ' + won(Number(draft.price || 0)) + '원으로 앱에 구성안을 저장할까요?'} confirmLabel="세트 구성 저장" confirmLoading={action.isPending} onConfirm={save}><p className="text-label text-ink">{menus.filter((menu) => draft.menuIds.includes(menu.id)).map((menu) => menu.name).join(' + ')}</p><p className="text-caption text-ink-sub">할인 부담 {won(regular - Number(draft.price || 0))}원/세트</p>{error && <p role="alert" className="text-caption text-danger">{error}</p>}</Modal>
    </form>
  )
}
