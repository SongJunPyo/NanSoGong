import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { ArrowUpRight } from 'lucide-react'
import { Screen } from '@/components/common/layout'
import { won } from '@/lib/format'
import { aggregateSales, previousMonth, salesDateRangeLabel } from '@/features/sales/analytics'
import { useSalesAnalytics } from '@/features/sales/queries'
import SalesTabs from '@/features/sales/components/SalesTabs'
import SalesTrend from '@/features/sales/components/SalesTrend'
import SalesCalendar from '@/features/sales/components/SalesCalendar'
import CostsPage from '@/features/sales/pages/CostsPage'
import PromotionPerformancePage from '@/features/coupon/pages/PromotionPerformancePage'

/** 매출의 세 탭은 같은 화면에서 전환한다. 한 번 연 탭의 입력·필터 상태도 유지한다. */
export default function SalesPage() {
  const { state } = useLocation()
  const initialTab = [0, 1, 2].includes(state?.salesTab) ? state.salesTab : 0
  const [activeTab, setActiveTab] = useState(initialTab)
  const [visitedTabs, setVisitedTabs] = useState([initialTab])
  const selectTab = (index) => {
    setActiveTab(index)
    setVisitedTabs((current) => current.includes(index) ? current : [...current, index])
  }
  const { data: analytics } = useSalesAnalytics()
  const [range, setRange] = useState(analytics.defaultRange)
  const summary = aggregateSales(analytics.days, range)
  const comparisonRange = { from: previousMonth(range.from), to: previousMonth(range.to) }
  const comparisonDays = analytics.comparisonDays.filter((day) => day.date >= comparisonRange.from && day.date <= comparisonRange.to)
  const comparison = comparisonDays.reduce((total, day) => total + day.amount, 0)
  const change = comparison > 0 && comparisonDays.length === summary.days.length ? (summary.amount - comparison) / comparison * 100 : null

  return (
    <Screen title="매출" back={false} tab wide>
      <SalesTabs value={activeTab} onChange={selectTab} />
      <div id="sales-panel-0" role="tabpanel" aria-labelledby="sales-tab-0" hidden={activeTab !== 0} className={activeTab === 0 ? "flex min-w-0 flex-col gap-4 lg:gap-6" : "hidden"}>
        <section aria-label="매출 요약" className="bg-hero grid gap-4 rounded-hero px-5 py-4 text-white sm:grid-cols-[1.5fr_1fr_1fr] sm:items-center lg:grid-cols-[1.5fr_1fr_1fr_1.3fr] lg:px-6">
          <div>
            <h2 className="text-caption font-medium text-white/80">{Number(range.from.slice(5, 7))}월 매출 ({salesDateRangeLabel(range)})</h2>
            <p className="num mt-1 text-[30px] leading-tight font-bold lg:text-[32px]">{won(summary.amount)}<span className="ml-1 text-lg">원</span></p>
            <p className="mt-1 text-[11px] text-white/75">총 매출 · 매장(POS)</p>
          </div>
          <dl className="grid grid-cols-2 gap-4 sm:col-span-2 lg:col-span-2">
            <div className="border-l border-white/20 pl-4"><dt className="text-caption text-white/75">주문 수</dt><dd className="num mt-1 text-xl font-bold">{won(summary.orders)}<span className="ml-1 text-caption font-medium">건</span></dd></div>
            <div className="border-l border-white/20 pl-4"><dt className="text-caption text-white/75">객단가</dt><dd className="num mt-1 text-xl font-bold">{won(summary.average)}<span className="ml-1 text-caption font-medium">원</span></dd></div>
          </dl>
          <div className="sm:col-span-3 lg:col-span-1 lg:justify-self-end">
            <p className="inline-flex items-center gap-1 rounded-lg bg-white/15 px-2.5 py-1.5 text-label font-bold">{change !== null && <ArrowUpRight size={17} aria-hidden="true" className={change < 0 ? 'rotate-90' : undefined} />}{change === null ? '비교 자료 없음' : `${change >= 0 ? '+' : ''}${change.toFixed(1)}%`}</p>
            <p className="mt-1 text-[11px] text-white/75">{salesDateRangeLabel(comparisonRange)} 대비</p>
          </div>
        </section>
        <SalesTrend analytics={analytics} summary={summary} range={range} onRangeChange={setRange} />
        <SalesCalendar />
        <p className="text-caption text-ink-sub">최근 매출 수집 11.19 21:00 · 매출은 판매 발생일 기준이며 정산 입금과 구분해요.</p>
      </div>
      <div id="sales-panel-1" role="tabpanel" aria-labelledby="sales-tab-1" hidden={activeTab !== 1} className={activeTab === 1 ? "flex min-w-0 flex-col gap-4 lg:gap-6" : "hidden"}>
        {visitedTabs.includes(1) && <CostsPage embedded />}
      </div>
      <div id="sales-panel-2" role="tabpanel" aria-labelledby="sales-tab-2" hidden={activeTab !== 2} className={activeTab === 2 ? "flex min-w-0 flex-col gap-4 lg:gap-6" : "hidden"}>
        {visitedTabs.includes(2) && <PromotionPerformancePage embedded />}
      </div>
    </Screen>
  )
}
