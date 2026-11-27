import { useRef, useState } from 'react'
import { ArrowDownRight, ArrowUpRight, BarChart3, CalendarDays, Info, Ticket } from 'lucide-react'
import { Screen } from '@/components/common/layout'
import { Card, H2, Pill } from '@/components/common/ui'
import { won } from '@/lib/format'
import { formatCalendarDate } from '@/utils/format'
import { useCouponDraft } from '@/features/coupon/useCouponDraft'
import { useEndPromotion, usePromotions } from '@/features/coupon/queries'
import { useSalesPromotionPerformance } from '@/features/sales/queries'
import { numberOfDays } from '@/features/menu/menuLogic'
import { salesDateRangeLabel } from '@/features/sales/analytics'
import SalesTabs from '@/features/sales/components/SalesTabs'
import SalesViewControl from '@/features/sales/components/SalesViewControl'
import { Modal } from '@/components/ui/modal'
import { EmptyState } from '@/components/ui/empty-state'
import { SkeletonCard } from '@/components/ui/loading'
import { toast } from '@/components/ui/toast'

const periodText = (p) => `${formatCalendarDate(p.startDate)} – ${formatCalendarDate(p.endDate)}`

/** 매출 안에서 사용 현황과 성과를 함께 확인한다. 기존 쿠폰 조회·종료 계약은 유지한다. */
export default function PromotionPerformancePage() {
  const draftName = useCouponDraft((s) => s.promotionName)
  const { data: promotions = [], isPending, error, refetch } = usePromotions()
  const { data: comparisons } = useSalesPromotionPerformance()
  const endMutation = useEndPromotion()
  const [tab, setTab] = useState('running')
  const [selectedId, setSelectedId] = useState(null)
  const [confirm, setConfirm] = useState(null)
  const comparisonPanel = useRef(null)
  const nameOf = (p) => p.id === 'latte-set' ? draftName : p.name
  const list = promotions.filter((p) => p.status === tab)
  const selected = list.find((p) => p.id === selectedId) ?? list[0]
  // 비교 표본의 프로모션 ID가 일치할 때만 연결한다. 다른 프로모션에 표본을 돌려 쓰지 않는다.
  const comparison = selected && comparisons.find((p) => p.id === selected.id)
  const showComparison = (id) => {
    setSelectedId(id)
    if (!window.matchMedia('(min-width: 1280px)').matches) requestAnimationFrame(() => {
      comparisonPanel.current?.focus({ preventScroll: true })
      comparisonPanel.current?.scrollIntoView({ block: 'start', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' })
    })
  }
  const end = () => {
    endMutation.mutate(confirm.id, {
      onSuccess: () => { setConfirm(null); setTab('ended'); toast('시연 목록의 운영 상태를 종료로 바꿨어요.') },
      onError: (err) => toast(err.message, { tone: 'error' }),
    })
  }

  return (
    <Screen title="매출" back={false} tab wide compact>
      <SalesTabs />
      <div className="flex flex-wrap items-start justify-between gap-2"><div><h2 className="text-h2 font-bold text-ink">프로모션 성과</h2><p className="mt-1 text-label text-ink-sub">사용 실적과 운영 전후 변화를 함께 확인해요.</p></div><span className="rounded-md bg-surface-muted px-2.5 py-1.5 text-caption font-bold text-ink-sub">시연 데이터</span></div>
      <div className="max-w-sm"><SalesViewControl label="프로모션 상태" value={tab} onChange={(value) => { setTab(value); setSelectedId(null) }} items={[{ value: 'running', label: `진행 중 ${promotions.filter((p) => p.status === 'running').length}` }, { value: 'ended', label: `종료 ${promotions.filter((p) => p.status === 'ended').length}` }]} /></div>
      {isPending ? <SkeletonCard lines={5} /> : error ? <Card tone="warn"><p role="alert" className="text-label text-danger">{error.message}</p><button type="button" onClick={() => refetch()} className="min-h-11 rounded-input bg-white px-4 text-label font-bold text-woori-deep">다시 불러오기</button></Card> : list.length === 0 ? <EmptyState kind={tab === 'running' ? 'first' : 'no-filter'} compact title={tab === 'running' ? '운영 중인 프로모션이 없어요' : '종료한 프로모션이 없어요'} /> : <div className="grid min-w-0 items-start gap-4 xl:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-4">
          <H2><span className="flex items-center gap-2"><Ticket size={19} aria-hidden="true" className="text-woori-deep" />사용 현황 <span className="text-caption font-medium text-ink-sub">{list.length}개</span></span></H2>
          {list.map((p) => <UsageCard key={p.id} p={p} name={nameOf(p)} selected={selected.id === p.id} onSelect={() => showComparison(p.id)} onEnd={() => setConfirm(p)} />)}
        </div>
        <div ref={comparisonPanel} tabIndex={-1} role="region" aria-label={`${nameOf(selected)} 성과 비교`} className="flex min-w-0 scroll-mt-40 flex-col gap-4 rounded-card outline-none focus-visible:ring-2 focus-visible:ring-woori-blue xl:sticky xl:top-40">
          <H2><span className="flex items-center gap-2"><BarChart3 size={19} aria-hidden="true" className="text-woori-deep" />프로모션 전후 비교</span></H2>
          <ComparisonCard name={nameOf(selected)} comparison={comparison} />
        </div>
      </div>}
      <p className="text-caption leading-relaxed text-ink-sub">시연 모드 · 사용 내역과 비교 수치는 예시예요. 운영 종료도 시연 상태에만 반영되며 실제 POS에는 반영되지 않아요.</p>
      <Modal open={Boolean(confirm)} onOpenChange={(open) => !open && setConfirm(null)} title={confirm ? `${nameOf(confirm)} 운영을 종료할까요?` : ''} description={confirm ? `시연 목록의 운영 상태를 종료로 바꿔요. 사용 실적 ${confirm.used}건은 유지해요. 실제 POS에는 반영되지 않아요.` : ''} confirmLabel="시연 운영 종료" confirmLoading={endMutation.isPending} confirmLoadingText="처리 중" onConfirm={end} tone="danger" />
    </Screen>
  )
}

function UsageCard({ p, name, selected, onSelect, onEnd }) {
  const usage = p.limit > 0 ? Math.round(p.used / p.limit * 100) : null
  return (
    <Card tone="line" pad="p-4 sm:p-5" gap="gap-4" className={selected ? 'border-woori-deep' : undefined}>
      <div className="flex flex-wrap items-start justify-between gap-2"><h3 className="min-w-0 text-body font-bold leading-relaxed text-ink">{name}</h3><Pill tone={p.status === 'running' ? 'deep' : 'gray'}>{p.status === 'running' ? '진행 중' : p.endedBy === 'owner' ? '직접 종료' : '기간 종료'}</Pill></div>
      <dl className="flex flex-col gap-2 text-caption"><div className="flex flex-wrap justify-between gap-2"><dt className="text-ink-sub">승인일</dt><dd className="font-medium text-ink">{p.approvedAt}</dd></div><div className="flex flex-wrap justify-between gap-2"><dt className="flex items-center gap-1 text-ink-sub"><CalendarDays size={13} aria-hidden="true" />운영 기간</dt><dd className="font-medium text-ink">{periodText(p)}</dd></div></dl>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-5 rounded-input bg-woori-tint p-4">
        {[['사용 건수', `${won(p.used)}건`], ['사용률', usage === null ? '집계 없음' : `${usage}%`], ['누적 할인액', `${won(p.discount)}원`], ['적용 매출', `${won(p.sales)}원`]].map(([label, value]) => <div key={label} className="min-w-0"><dt className="text-caption text-ink-sub">{label}</dt><dd className="num mt-1 text-xl font-bold text-woori-deep">{value}</dd></div>)}
      </dl>
      <div><div aria-hidden="true" className="h-2 overflow-hidden rounded-full bg-surface-muted"><div className="h-full rounded-full bg-woori-deep" style={{ width: `${Math.min(usage ?? 0, 100)}%` }} /></div><p className="mt-2 text-caption text-ink-sub">사용률은 사용 한도 {won(p.limit)}장 기준이에요. 발행량은 POS 미제공으로 확인할 수 없어요.</p></div>
      <p className="text-caption text-ink-sub">최근 수집 {p.lastSync}</p>
      <div className="flex flex-wrap gap-2 border-t border-line pt-3"><button type="button" aria-pressed={selected} onClick={onSelect} className={`min-h-11 flex-1 rounded-input px-3 text-label font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-woori-blue ${selected ? 'bg-woori-deep text-white' : 'border border-line text-woori-deep hover:bg-woori-tint'}`}>성과 비교 보기</button>{p.status === 'running' && <button type="button" onClick={onEnd} className="min-h-11 rounded-input border border-line px-3 text-label text-danger focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-danger">운영 종료</button>}</div>
    </Card>
  )
}

function ComparisonCard({ name, comparison }) {
  if (!comparison) return <Card tone="line" pad="p-5" gap="gap-3"><p className="text-body font-bold text-ink">{name}</p><p role="status" className="text-label leading-relaxed text-ink-sub">이 프로모션은 전후 비교 자료가 없어요. 사용 현황에서 실적을 확인해 주세요.</p></Card>
  const { before, after, expectedLift } = comparison
  const lift = after.orders - before.orders
  const change = before.orders > 0 ? lift / before.orders * 100 : null
  const menuChange = before.menuSales > 0 ? (after.menuSales - before.menuSales) / before.menuSales * 100 : null
  const max = Math.max(before.orders, after.orders, 1)
  const signed = (value) => `${value > 0 ? '+' : ''}${won(value)}`
  const Direction = lift < 0 ? ArrowDownRight : ArrowUpRight
  return (
    <Card tone="line" pad="p-4 sm:p-5" gap="gap-5">
      <div><p className="text-body font-bold text-ink">{name}</p><p className="mt-1 text-caption text-ink-sub">평일 오후 · 하루 평균 주문 비교</p></div>
      <div className="rounded-input bg-woori-tint p-4"><p className="text-caption text-ink-sub">프로모션 전 대비 관측 변화</p><p className="num mt-2 flex flex-wrap items-center gap-2 text-[26px] leading-tight font-bold text-woori-deep"><Direction size={23} aria-hidden="true" />{signed(lift)}건/일 <span className="text-body">{change === null ? '비교율 없음' : `(${change > 0 ? '+' : ''}${change.toFixed(1)}%)`}</span></p></div>
      <dl className="flex flex-col gap-5">
        {[['프로모션 전', before, 'bg-[#b2d3e9]'], ['프로모션 후', after, 'bg-woori-deep']].map(([label, data, color]) => <div key={label}><div className="flex items-baseline justify-between gap-2"><dt className="text-label font-bold text-ink">{label}</dt><dd className="num text-xl font-bold text-ink">{data.orders}<span className="ml-1 text-caption font-medium text-ink-sub">건/일</span></dd></div><div aria-hidden="true" className="mt-2 h-7 overflow-hidden rounded-lg bg-surface-muted"><div className={`h-full rounded-lg ${color}`} style={{ width: `${data.orders / max * 100}%` }} /></div><p className="mt-2 text-caption text-ink-sub">{salesDateRangeLabel(data)} · {numberOfDays(data.from, data.to)}일 관측</p></div>)}
      </dl>
      <dl className="grid grid-cols-2 gap-3 border-t border-line pt-4"><div><dt className="text-caption text-ink-sub">바닐라 라떼 판매 변화</dt><dd className="num mt-1 text-lg font-bold text-woori-deep">{menuChange === null ? '자료 없음' : `${signed(Math.round(menuChange))}%`}</dd></div><div><dt className="text-caption text-ink-sub">추천 당시 예상 증가</dt><dd className="num mt-1 text-lg font-bold text-ink">{signed(expectedLift)}건/일</dd></div></dl>
      <p className="flex items-start gap-2 rounded-input bg-surface-muted p-3 text-caption leading-relaxed text-ink-sub"><Info size={16} aria-hidden="true" className="mt-0.5 shrink-0" />운영 전후 관측 기간이 달라요. 날씨 등 다른 요인도 영향을 주므로 이 변화를 프로모션만의 효과로 단정할 수 없어요.</p>
    </Card>
  )
}
