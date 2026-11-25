import { useState } from 'react'
import { Screen } from '@/components/common/layout'
import { BarChart, Card, HeadRow, Hero, HeroLabel, HeroValue, KV, ListRow, P, Pill, Segmented } from '@/components/common/ui'
import { won } from '@/lib/format'
import { SALES_TAB_LABELS, SALES_TABS } from '@/features/sales/constants'
import { useSalesSummary } from '@/features/sales/queries'
import { SegmentedControl } from '@/components/ui/segmented-control'

const PERIODS = [
  { value: 'day', label: '일' },
  { value: 'week', label: '주' },
  { value: 'month', label: '월' },
  { value: 'year', label: '연' },
]

/** 41 매출 (UF-17 1~3) — 일·주·월·연을 누르면 요약 · 차트 · 비교가 함께 바뀐다 */
export default function SalesPage() {
  const { data: summary } = useSalesSummary()
  const [period, setPeriod] = useState('month')
  const s = summary[period]

  return (
    <Screen title="매출" back={false} tab wide>
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="w-full md:max-w-sm">
          <Segmented items={SALES_TAB_LABELS} active={0} links={SALES_TABS} />
        </div>
        <div className="w-full md:w-64">
          <SegmentedControl label="기간" size="sm" value={period} onChange={setPeriod} items={PERIODS} />
        </div>
      </div>
      <div className="grid min-w-0 gap-4 md:grid-cols-2 lg:gap-6">
        <Hero className="justify-center md:min-h-48 md:p-6">
          <HeroLabel>{s.label}</HeroLabel>
          <HeroValue size="text-display lg:text-[40px]">{won(s.amount)}원</HeroValue>
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-[13px]">
            <span className="text-[#d9ebfa]">
              주문 {s.orders.toLocaleString('ko-KR')}건 · 객단가 {won(s.avg)}원
            </span>
            <span className="ml-auto text-label font-bold text-white">{s.change}</span>
          </div>
        </Hero>
        <Card tone="line">
          <HeadRow title="매출 추이" size="text-base">
            <Pill>{s.compareLabel}</Pill>
          </HeadRow>
          <BarChart key={period} values={s.chart} highlight={s.chart.length - 1} labels={s.chartLabels ?? undefined} height={160} />
          <P tone="mute" small>
            진한 막대가 이번 기간이에요. 매출은 POS 결제 금액 기준이고, 프로모션 할인을 뺀 실제 받은 금액이에요.
          </P>
        </Card>
      </div>
      <div className="grid min-w-0 gap-4 md:grid-cols-2 lg:gap-6">
        <Card>
          <KV label="기준 기간" value={s.base} />
          <KV label="비교 기간" value={s.compare} />
          <KV label="증감" value={s.diff} tone="deep" />
        </Card>
        <Card tone="line" gap="gap-0" pad="px-4 py-1">
          <ListRow title="매출 캘린더" value="11월" to="/sales/calendar" />
          <ListRow title="비용·예상 이익" value="3,881,600원" to="/sales/costs" />
          <ListRow title="프로모션 성과" value="진행 1건" to="/sales/promotions" />
        </Card>
      </div>
    </Screen>
  )
}
