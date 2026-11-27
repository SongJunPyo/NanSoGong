import { useState } from 'react'
import { ArrowUpRight } from 'lucide-react'
import { Screen } from '@/components/common/layout'
import { won } from '@/lib/format'
import { aggregateSales, previousMonth, salesDateRangeLabel } from '@/features/sales/analytics'
import { useSalesAnalytics } from '@/features/sales/queries'
import SalesTabs from '@/features/sales/components/SalesTabs'
import SalesTrend from '@/features/sales/components/SalesTrend'
import SalesCalendar from '@/features/sales/components/SalesCalendar'

/** 매출 현황 — 요약·추이·캘린더는 같은 POS 매출 자료를 사용한다. */
export default function SalesPage() {
  const { data: analytics } = useSalesAnalytics()
  const [range, setRange] = useState(analytics.defaultRange)
  const summary = aggregateSales(analytics.days, range)
  const comparisonRange = { from: previousMonth(range.from), to: previousMonth(range.to) }
  const comparisonDays = analytics.comparisonDays.filter((day) => day.date >= comparisonRange.from && day.date <= comparisonRange.to)
  const comparison = comparisonDays.reduce((total, day) => total + day.amount, 0)
  const change = comparison > 0 && comparisonDays.length === summary.days.length ? (summary.amount - comparison) / comparison * 100 : null

  return (
    <Screen title="매출" back={false} tab wide compact>
      <SalesTabs />
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div><h2 className="text-h2 font-bold text-ink">매출 현황</h2><p className="mt-1 text-label text-ink-sub">얼마나 팔렸는지, 언제 바빴는지 확인해요.</p></div>
        <span className="rounded-md bg-surface-muted px-2.5 py-1.5 text-caption font-bold text-ink-sub">시연 데이터</span>
      </div>
      <section aria-label="매출 요약" className="bg-hero grid gap-4 rounded-hero px-5 py-4 text-white sm:grid-cols-[1.5fr_1fr_1fr] sm:items-center lg:grid-cols-[1.5fr_1fr_1fr_1.3fr]">
        <div>
          <h3 className="text-caption font-medium text-[#d9ebfa]">총 매출 · {salesDateRangeLabel(range)}</h3>
          <p className="num mt-1 text-[28px] leading-tight font-bold lg:text-[32px]">{won(summary.amount)}<span className="ml-1 text-label">원</span></p>
          <p className="mt-1 text-caption text-[#d9ebfa]">매장(POS) · 수집된 {summary.days.length}일</p>
        </div>
        <dl className="grid grid-cols-2 gap-4 sm:col-span-2 lg:col-span-2">
          <div className="border-l border-white/25 pl-4"><dt className="text-caption text-[#d9ebfa]">주문 수</dt><dd className="num mt-1 text-xl font-bold">{won(summary.orders)}<span className="ml-1 text-caption font-medium">건</span></dd></div>
          <div className="border-l border-white/25 pl-4"><dt className="text-caption text-[#d9ebfa]">객단가</dt><dd className="num mt-1 text-xl font-bold">{won(summary.average)}<span className="ml-1 text-caption font-medium">원</span></dd></div>
        </dl>
        <div className="sm:col-span-3 lg:col-span-1 lg:justify-self-end">
          <p className="inline-flex items-center gap-1 rounded-lg bg-white/15 px-2.5 py-1.5 text-label font-bold">{change !== null && <ArrowUpRight size={17} aria-hidden="true" className={change < 0 ? 'rotate-90' : undefined} />}{change === null ? '비교 자료 없음' : `${change >= 0 ? '+' : ''}${change.toFixed(1)}%`}</p>
          <p className="mt-1 text-caption text-[#d9ebfa]">{salesDateRangeLabel(comparisonRange)} 대비</p>
        </div>
      </section>
      <div className="grid min-w-0 items-start gap-4 xl:grid-cols-[1.15fr_1fr]">
        <SalesTrend analytics={analytics} summary={summary} range={range} onRangeChange={setRange} />
        <SalesCalendar />
      </div>
      <p className="text-caption leading-relaxed text-ink-sub">시연 자료 기준 11.19 21:00 · 실제 매장 데이터가 아니에요. 매출은 판매 발생일 기준이며 정산 입금과 구분해요.</p>
    </Screen>
  )
}
