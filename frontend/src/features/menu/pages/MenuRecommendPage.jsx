import { useEffect, useRef, useState } from 'react'
import { Coffee, Lightbulb, Sparkles, TrendingUp } from 'lucide-react'
import { Screen } from '@/components/common/layout'
import { Card, H2, Pill } from '@/components/common/ui'
import { ButtonLoading, SkeletonCard, Spinner } from '@/components/ui/loading'
import { Sheet } from '@/components/ui/sheet'
import { toast } from '@/components/ui/toast'
import { useMenuAnalysis, useMenuRecommendationAction, useMenuWorkspace } from '@/features/menu/queries'
import { demoPeriod } from '@/features/menu/mock'
import { RECOMMENDATION_STATUSES, shortDate } from '@/features/menu/menuLogic'
import { won } from '@/lib/format'
import MenuTabs from '@/features/menu/components/MenuTabs'
import MenuForm from '@/features/menu/components/MenuForm'
import MenuRecommendationCard, { MenuSetForm } from '@/features/menu/components/MenuRecommendationCard'
import { MenuSelect } from '@/features/menu/components/MenuFields'

export default function MenuRecommendPage() {
  const workspaceQuery = useMenuWorkspace()
  const analysis = useMenuAnalysis({ ...demoPeriod, group: 'ALL', weather: 'ALL' })
  const [stage, setStage] = useState('')
  const [pendingKind, setPendingKind] = useState(null)
  const [filter, setFilter] = useState('ALL')
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const [focusId, setFocusId] = useState(null)
  const generationLock = useRef(false)
  const generate = useMenuRecommendationAction(setStage)
  const workspace = workspaceQuery.data
  const best = analysis.data?.popular[0]
  const poor = analysis.data?.poor[0]
  const recommendations = workspace?.recommendations.filter((rec) => filter === 'ALL' || rec.status === filter) ?? []
  useEffect(() => { if (focusId) document.getElementById(focusId)?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' }) }, [focusId])
  const create = async (kind) => {
    if (generationLock.current) return
    generationLock.current = true; setPendingKind(kind)
    try {
      const response = await generate.mutateAsync(kind)
      setFilter('ALL'); setFocusId(response.result.id)
      toast('판매 근거가 포함된 시연 추천안을 만들었어요.')
    } catch (err) { toast(err.message, { tone: 'error' }) }
    finally { generationLock.current = false; setPendingKind(null) }
  }
  const approve = (recommendation) => { setEditing(recommendation); setSaving(false); setFilter('ALL') }
  const finish = () => { setEditing(null); setFocusId(null) }
  const busy = generate.isPending || !analysis.data

  return (
    <Screen title="메뉴" back={false} tab wide compact>
      <MenuTabs />
      <div><p className="mb-1 flex items-center gap-1.5 text-caption font-bold text-woori-blue"><Sparkles size={15} aria-hidden="true" />판매 자료 기반 · 시연 추천</p><h2 className="text-h2 font-bold text-ink">AI 메뉴 추천</h2><p className="mt-2 text-label text-ink-sub">유지할 메뉴와 바꿀 메뉴를 살펴보고, 필요한 추천만 받아요.</p></div>
      <p className="rounded-input bg-woori-tint px-4 py-3 text-caption text-woori-deep">시연 모드 · {shortDate(demoPeriod.from)}–{shortDate(demoPeriod.to)} 판매 자료를 집계해 추천 초안을 만들어요. AI·네이버 검색 API는 연결되지 않았으며 실제 검색량은 조회하지 않아요.</p>
      {workspaceQuery.error || analysis.error ? <Card tone="warn"><p role="alert" className="text-label text-danger">{(workspaceQuery.error ?? analysis.error).message}</p><button type="button" onClick={() => { workspaceQuery.refetch(); analysis.refetch() }} className="min-h-11 rounded-input border border-line bg-white px-4 text-label font-bold text-woori-deep">다시 불러오기</button></Card> : workspaceQuery.isPending || analysis.isPending ? <SkeletonCard lines={5} /> : <>
        <div className="grid items-stretch gap-4 xl:grid-cols-3">
          <Card gap="gap-3" pad="p-4 sm:p-5" className="xl:col-span-3"><div className="flex items-center justify-between gap-2"><H2><span className="flex items-center gap-2"><TrendingUp size={18} className="text-woori-blue" aria-hidden="true" />인기 메뉴 유지 추천</span></H2><Pill tone="deep">판매 상위</Pill></div>{best ? <><p className="text-label leading-relaxed text-ink"><strong>{best.menu.name}</strong>가 꾸준히 잘 팔리고 있어요. 현재 메뉴 구성을 유지해 보세요!</p><div className="flex flex-wrap gap-2"><Pill>{best.rank}위</Pill><Pill>{won(best.quantity)}개 판매</Pill><Pill tone="gray">최근 {best.change === null ? '비교 자료 부족' : (best.change >= 0 ? '+' : '') + best.change.toFixed(1) + '%'}</Pill></div><p className="text-caption text-ink-sub">근거: 같은 기간의 판매 수량·순위·직전 기간 대비 변화</p></> : <p className="text-label text-ink-sub">유지 추천을 판단할 판매 자료가 부족합니다.</p>}</Card>
          <Card tone="line" gap="gap-4" pad="p-5"><H2><span className="flex items-center gap-2"><Lightbulb size={18} className="text-woori-blue" aria-hidden="true" />부진 분석 · 신메뉴 제안</span></H2><p className="text-label leading-relaxed text-ink">{poor ? poor.menu.name + ' 판매가 직전 기간보다 ' + Math.abs(poor.change).toFixed(1) + '% 감소했어요. 기존 재료를 활용한 새 구성을 검토해 보세요.' : '메뉴별 판매와 기존 재료를 바탕으로 새로운 구성을 검토해 보세요.'}</p><p className="text-caption text-ink-sub">시즌 외 메뉴나 출시 직후 메뉴를 부진으로 단정하지 않아요.</p><ButtonLoading variant="secondary" className="mt-auto" loading={pendingKind === 'NEW'} disabled={busy && pendingKind !== 'NEW'} loadingText="추천 구성 중..." onClick={() => create('NEW')}>AI 신메뉴 추천받기</ButtonLoading></Card>
          <Card tone="line" gap="gap-4" pad="p-5"><H2><span className="flex items-center gap-2"><Coffee size={18} className="text-woori-blue" aria-hidden="true" />세트 메뉴 제안</span></H2><p className="text-label leading-relaxed text-ink">함께 주문된 시연 이력이 있는 인기 음료와 디저트로 세트를 구성해 보세요.</p><p className="text-caption text-ink-sub">구성·세트 가격·할인 부담을 확인한 뒤 저장할 수 있어요.</p><ButtonLoading variant="secondary" className="mt-auto" loading={pendingKind === 'SET'} disabled={busy && pendingKind !== 'SET'} loadingText="구성 검토 중..." onClick={() => create('SET')}>AI 세트 추천받기</ButtonLoading></Card>
          <Card tone="line" gap="gap-4" pad="p-5"><H2><span className="flex items-center gap-2"><Sparkles size={18} className="text-woori-blue" aria-hidden="true" />기존 메뉴 개선 제안</span></H2><p className="text-label leading-relaxed text-ink">{poor ? poor.menu.name + '의 이름·레시피를 점검하고 변경 전후를 확인해 보세요.' : '현재는 비교 자료가 충분한 판매 감소 메뉴가 없어요.'}</p><p className="text-caption text-ink-sub">개선안 승인만으로 가격·레시피·판매 상태가 바뀌지는 않아요.</p><ButtonLoading variant="secondary" className="mt-auto" loading={pendingKind === 'IMPROVE'} disabled={!poor || busy && pendingKind !== 'IMPROVE'} loadingText="개선안 구성 중..." onClick={() => create('IMPROVE')}>AI 메뉴 개선안 받기</ButtonLoading></Card>
        </div>
        {generate.isPending && <div aria-live="polite" className="rounded-input bg-woori-tint p-4"><Spinner showLabel label={stage} /><p className="mt-2 text-caption text-ink-sub">현재 시연 데이터를 집계하는 단계예요. 외부 검색은 수행하지 않아요.</p></div>}
        <div className="flex flex-wrap items-end justify-between gap-3"><div><H2>추천안 검토</H2><p className="mt-1 text-label text-ink-sub">추천을 승인한 뒤 내용을 수정하고, 최종 저장해야 반영돼요.</p></div><div className="w-full sm:w-44"><MenuSelect label="추천 상태" value={filter} onChange={(event) => setFilter(event.target.value)}><option value="ALL">모든 상태</option>{Object.entries(RECOMMENDATION_STATUSES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</MenuSelect></div></div>
        <ol aria-label="추천안 반영 순서" className="grid grid-cols-3 gap-2 rounded-input bg-surface-muted p-3">{['초안 검토·승인', '상세 수정', '최종 저장'].map((label, index) => <li key={label} className="flex min-w-0 flex-col items-center gap-2 text-center text-caption font-medium text-ink sm:flex-row sm:justify-center"><span className="num inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-white font-bold text-woori-deep">{index + 1}</span>{label}</li>)}</ol>
        <div className="grid items-start gap-4 xl:grid-cols-2">{recommendations.map((rec) => <MenuRecommendationCard key={rec.id} recommendation={rec} onApproved={approve} />)}{!recommendations.length && <Card tone="line"><p className="py-8 text-center text-label text-ink-sub">{workspace.recommendations.length ? '해당 상태의 추천안이 없어요.' : '위 분석에서 필요한 추천받기 버튼을 눌러 초안을 만들어 보세요.'}</p></Card>}</div>
      </>}
      <Sheet open={Boolean(editing)} onOpenChange={(open) => { if (!open && !saving) setEditing(null) }} title={editing?.kind === 'SET' ? '승인한 세트 구성 수정' : '승인한 추천 상세 수정'} description="승인한 초안을 검토하는 단계예요. 최종 저장 전에는 메뉴가 변경되지 않아요.">
        {editing && workspace && (editing.kind === 'SET' ? <MenuSetForm key={editing.id} recommendation={editing} onSaved={finish} onCancel={() => setEditing(null)} onBusyChange={setSaving} /> : <MenuForm key={editing.id} initial={editing.draft} recommendationId={editing.id} submitLabel={editing.kind === 'NEW' ? '메뉴 추가하기' : '변경 내용 저장'} onSaved={finish} onCancel={() => setEditing(null)} onBusyChange={setSaving} />)}
      </Sheet>
    </Screen>
  )
}
