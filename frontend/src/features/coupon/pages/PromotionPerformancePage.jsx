import { useState } from 'react'
import { ArrowRight, BarChart3, Ticket, TrendingUp } from 'lucide-react'
import { Screen } from '@/components/common/layout'
import { Card, H2, Pill } from '@/components/common/ui'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { useCouponDraft } from '@/features/coupon/useCouponDraft'
import { useSalesPromotionPerformance } from '@/features/sales/queries'
import { formatSalesDate, salesDateRangeLabel } from '@/features/sales/analytics'
import SalesTabs from '@/features/sales/components/SalesTabs'
import { won } from '@/lib/format'

function PromotionUsage({ promotion, name }) {
  const usage = promotion.limit ? Math.round(promotion.used / promotion.limit * 100) : null
  const metrics = [
    ['사용 건수', `${won(promotion.used)}건`],
    ['사용률', usage === null ? '확인 불가' : `${usage}%`],
    ['누적 할인액', `${won(promotion.discount)}원`],
    ['프로모션 적용 매출', `${won(promotion.sales)}원`],
  ]

  return (
    <Card tone="line" gap="gap-5" pad="p-4 sm:p-6">
      <H2><span className="flex items-center gap-2"><Ticket size={19} className="text-woori-blue" aria-hidden="true" />사용 현황</span></H2>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><h3 className="text-lg font-bold text-ink">{name}</h3><p className="mt-1 text-caption text-ink-sub">승인일 {formatSalesDate(promotion.approvedAt, true)} · POS 반영 완료</p></div>
        <Pill tone={promotion.status === 'active' ? 'ok' : 'gray'}>{promotion.status === 'active' ? '진행 중' : '종료'}</Pill>
      </div>
      <div className="flex flex-wrap justify-between gap-2 rounded-input bg-surface-muted px-4 py-3 text-label"><span className="text-ink-sub">운영 기간</span><strong className="text-ink">{salesDateRangeLabel(promotion)}</strong></div>
      <dl className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {metrics.map(([label, value], index) => (
          <div key={label} className={`min-w-0 rounded-input p-3.5 sm:p-4 ${index === 3 ? 'bg-woori-deep text-white' : 'bg-woori-tint'}`}>
            <dt className={`mb-2 text-caption ${index === 3 ? 'text-white/80' : 'text-ink-sub'}`}>{label}</dt>
            <dd className={`num text-xl font-bold sm:text-2xl ${index === 3 ? 'text-white' : 'text-woori-deep'}`}>{value}</dd>
          </div>
        ))}
      </dl>
      <div>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-caption"><span className="text-ink-sub">사용 한도 {won(promotion.limit)}장 기준</span><strong className="text-woori-deep">{promotion.used} / {promotion.limit}장 사용</strong></div>
        <div role="progressbar" aria-label="사용 한도 대비 프로모션 사용률" aria-valuenow={usage ?? 0} aria-valuemin={0} aria-valuemax={100} className="h-2 overflow-hidden rounded-full bg-surface-muted"><div className="h-full rounded-full bg-woori-blue" style={{ width: `${Math.min(usage ?? 0, 100)}%` }} /></div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3 text-label"><span className="text-ink-sub">발행량</span>{promotion.issued === null ? <Pill tone="amber">확인 불가 · POS 미제공</Pill> : <strong className="num text-ink">{won(promotion.issued)}장</strong>}</div>
      <p className="text-caption text-ink-sub">최근 수집 {promotion.updatedAt} · 취소 {promotion.cancellationCount}건 반영. 사용률은 발행량이 아닌 사용 한도를 기준으로 계산해요.</p>
      <details className="border-t border-line pt-3">
        <summary className="cursor-pointer text-label font-medium text-ink-sub">최근 사용 내역</summary>
        <ul className="mt-2 divide-y divide-line">{promotion.history.map((record) => <li key={record.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-caption"><span className="text-ink-sub">{record.date} · 주문 #{record.id}</span><Pill tone={record.status === '취소' ? 'gray' : 'ok'}>{record.status}</Pill></li>)}</ul>
      </details>
    </Card>
  )
}

function PromotionComparison({ promotion }) {
  const before = promotion.before.orders
  const after = promotion.after.orders
  const difference = after - before
  const change = before > 0 ? difference / before * 100 : null
  const menuChange = promotion.before.menuSales > 0 ? (promotion.after.menuSales - promotion.before.menuSales) / promotion.before.menuSales * 100 : null
  const maximum = Math.max(before, after, 1)
  const expectedDifference = difference - promotion.expectedLift

  return (
    <Card tone="line" gap="gap-5" pad="p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2"><H2><span className="flex items-center gap-2"><BarChart3 size={19} className="text-woori-blue" aria-hidden="true" />프로모션 전후 비교</span></H2><Pill tone={difference >= 0 ? 'deep' : 'warn'}>{change === null ? '비교 자료 없음' : `하루 주문 ${change >= 0 ? '+' : ''}${change.toFixed(1)}%`}</Pill></div>
      <p className="text-caption text-ink-sub">직전 2주와 운영 중 수집된 기간의 하루 평균을 비교했어요.</p>
      <div role="img" aria-label={`하루 평균 주문: 프로모션 전 ${before}건, 후 ${after}건, 변화 ${won(difference, true)}건`} className="grid grid-cols-2 gap-4 rounded-input bg-surface-muted p-4 sm:gap-8 sm:px-10">
        {[['프로모션 전', promotion.before, before], ['프로모션 후', promotion.after, after]].map(([label, period, value], index) => (
          <div key={label} className="flex min-w-0 flex-col items-center gap-2">
            <p className={`text-label font-bold ${index === 1 ? 'text-woori-deep' : 'text-ink-sub'}`}>{label}</p>
            <div className="flex h-40 w-full max-w-32 flex-col justify-end">
              <p className={`num mb-2 text-center text-2xl font-bold ${index === 1 ? 'text-woori-deep' : 'text-ink-sub'}`}>{value}<span className="ml-1 text-caption">건/일</span></p>
              <div className={`min-h-1 rounded-t-xl ${index === 1 ? 'bg-woori-blue' : 'bg-[#c7def2]'}`} style={{ height: `${value / maximum * 110}px` }} />
            </div>
            <p className="text-center text-[11px] text-ink-sub">{salesDateRangeLabel(period)}</p>
          </div>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-input bg-woori-tint p-4"><p className="mb-2 text-caption text-ink-sub">평일 오후 하루 주문</p><p className="flex flex-wrap items-center gap-2 text-lg font-bold text-ink">{before}건 <ArrowRight size={17} className="text-ink-mute" aria-hidden="true" />{after}건</p><p className={`num mt-2 text-label font-bold ${difference >= 0 ? 'text-woori-deep' : 'text-danger'}`}>{won(difference, true)}건 {change === null ? '' : `(${change >= 0 ? '+' : ''}${change.toFixed(1)}%)`}</p></div>
        <div className="rounded-input bg-woori-tint p-4"><p className="mb-2 text-caption text-ink-sub">대상 메뉴 판매 변화</p><p className="flex items-center gap-2 text-2xl font-bold text-woori-deep"><TrendingUp size={22} aria-hidden="true" />{menuChange === null ? '비교 자료 없음' : `${menuChange >= 0 ? '+' : ''}${menuChange.toFixed(0)}%`}</p><p className="mt-2 text-caption text-ink-sub">프로모션 적용 메뉴 · 하루 평균 기준</p></div>
      </div>
      <div className="rounded-input border border-line px-4 py-3 text-caption"><p className="text-ink">추천 시 예상 <strong>하루 +{promotion.expectedLift}건</strong> · 관측된 변화 <strong>{won(difference, true)}건</strong></p><p className="mt-1 text-ink-sub">{expectedDifference === 0 ? '현재 관측된 증가량은 예상과 같아요.' : `예상 증가량보다 하루 ${won(Math.abs(expectedDifference))}건 ${expectedDifference > 0 ? '많아요' : '적어요'}.`}</p></div>
      <p className="border-t border-line pt-3 text-caption text-ink-sub">관측된 변화예요. 날씨·요일 등 다른 요인도 있어서 전부 프로모션의 효과라고 단정할 수는 없어요.</p>
    </Card>
  )
}

/** /sales/promotions 전용 성과 화면. 다른 프로모션 생성·승인 화면은 변경하지 않는다. */
export default function PromotionPerformancePage() {
  const [status, setStatus] = useState('active')
  const { data: promotions } = useSalesPromotionPerformance()
  const draftName = useCouponDraft((state) => state.promotionName)
  const selected = promotions.filter((promotion) => promotion.status === status)

  return (
    <Screen title="매출" back={false} tab wide>
      <SalesTabs />
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-h2 font-bold text-ink">프로모션 성과</h2><p className="mt-1 text-caption text-ink-sub">사용 현황과 운영 전후의 변화를 확인하세요.</p></div><div className="w-44"><SegmentedControl label="프로모션 상태" size="sm" value={status} onChange={setStatus} items={[{ value: 'active', label: '진행 중' }, { value: 'ended', label: '종료' }]} /></div></div>
      {selected.length === 0 ? <Card tone="line"><p className="py-10 text-center text-label text-ink-sub">해당 상태의 프로모션이 없어요.</p></Card> : selected.map((promotion) => (
        <div key={promotion.id} className="flex min-w-0 flex-col gap-4 lg:gap-6">
          <PromotionUsage promotion={promotion} name={promotion.id === 'latte-set' ? draftName : promotion.name} />
          <PromotionComparison promotion={promotion} />
        </div>
      ))}
    </Screen>
  )
}
