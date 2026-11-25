import { AlertTriangle, Info, Plus } from 'lucide-react'
import { Screen } from '@/components/common/layout'
import { Button, Card, H2, Pill } from '@/components/common/ui'
import { useCostForecast, useCosts } from '@/features/sales/queries'
import SalesTabs from '@/features/sales/components/SalesTabs'
import { won } from '@/lib/format'

/** 비용·예상 이익 — 기존 비용 추가/분류 화면 연결을 유지한다. */
export default function CostsPage() {
  const { data: costs } = useCosts()
  const { data: forecast } = useCostForecast()
  const profit = forecast.revenue - forecast.estimatedCost - forecast.operatingCost

  return (
    <Screen title="매출" back={false} tab wide>
      <SalesTabs />
      <section aria-label="예상 이익 요약" className="bg-hero flex flex-wrap items-center justify-between gap-4 rounded-hero px-5 py-5 text-white lg:px-6">
        <div><h2 className="text-caption text-white/80">{forecast.period} · 예상 이익</h2><p className="num mt-1 text-[32px] leading-tight font-bold">{won(profit)}<span className="ml-1 text-lg">원</span></p></div>
        <div className="rounded-input bg-white/15 px-4 py-3"><p className="text-caption text-white/80">예상 이익률</p><p className="num mt-1 text-xl font-bold">{forecast.revenue ? (profit / forecast.revenue * 100).toFixed(1) : '—'}%</p></div>
      </section>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[['예상 매출', forecast.revenue, '월말까지의 매출 추정'], ['차감 · 추정 원가', forecast.estimatedCost, '레시피·판매량 기준'], ['차감 · 운영비', forecast.operatingCost, '등록된 비용 4종']].map(([label, value, description], index) => (
          <Card key={label} tone="line" pad="p-4" gap="gap-1"><p className="text-caption text-ink-sub">{label}</p><p className={`num text-xl font-bold ${index === 0 ? 'text-woori-deep' : 'text-ink'}`}>{won(value)}<span className="ml-1 text-label">원</span></p><p className="text-caption text-ink-sub">{description}</p></Card>
        ))}
      </div>
      <p className="flex items-start gap-2 text-caption text-ink-sub"><Info size={15} className="mt-0.5 shrink-0" aria-hidden="true" />예상 매출 − 추정 원가 − 운영비 = 예상 이익. 월말 추정치이며, 매출 현황의 현재 누적 매출과는 기준이 달라요.</p>
      <div className="grid items-start gap-4 xl:grid-cols-[1.4fr_1fr] lg:gap-6">
        <Card tone="line" gap="gap-4" pad="p-4 sm:p-6">
          <div className="flex items-center justify-between gap-2"><H2>운영 비용</H2><Pill tone="gray">11월 기준</Pill></div>
          <div className="hidden grid-cols-[1fr_1.2fr_1fr] gap-3 border-b border-line pb-2 text-caption text-ink-sub sm:grid"><span>항목</span><span>출처</span><span className="text-right">금액</span></div>
          <dl className="divide-y divide-line">
            {costs.map((cost) => (
              <div key={cost.title} className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1 py-4 first:pt-0 sm:grid-cols-[1fr_1.2fr_1fr]">
                <dt className="text-body font-medium text-ink">{cost.title}</dt>
                <dd className="col-start-1 row-start-2 text-caption text-ink-sub sm:col-start-2 sm:row-start-1">{cost.sub}</dd>
                <dd className="num col-start-2 row-start-1 text-right text-body font-bold text-ink sm:col-start-3">{cost.value}</dd>
              </div>
            ))}
          </dl>
          <div className="flex items-center justify-between rounded-input bg-woori-tint p-4"><span className="text-label font-bold text-ink">운영비 합계</span><span className="num text-lg font-bold text-woori-deep">{won(forecast.operatingCost)}원</span></div>
          <Button variant="outline" to="/sales/costs/new"><Plus size={17} className="mr-1" aria-hidden="true" />비용 추가</Button>
        </Card>
        <div className="flex min-w-0 flex-col gap-4">
          <Card tone="amber" gap="gap-4" pad="p-4 sm:p-5">
            <H2><span className="flex items-center gap-2"><AlertTriangle size={19} className="shrink-0 text-warning" aria-hidden="true" />확인이 필요한 거래 <span className="text-warning">{forecast.reviews.length}건</span></span></H2>
            <p className="text-caption text-ink-sub">분류와 중복 여부를 확인하면 예상 이익을 더 정확하게 볼 수 있어요.</p>
            {forecast.reviews.map((review) => (
              <div key={review.id} className="rounded-input bg-white/75 p-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-label font-bold text-ink">{review.title}</p><p className="num text-body font-bold text-warning">{won(review.amount)}원</p></div>
                <p className="mt-1 text-caption text-ink-sub">{review.source}</p><p className="mt-2 text-caption font-medium text-warning">{review.reason}</p>
              </div>
            ))}
            <Button variant="outline" to="/sales/costs/classify">분류 확인하기</Button>
          </Card>
          <Card tone="line" gap="gap-3" pad="p-4 sm:p-5">
            <H2>계산 기준</H2>
            <dl className="flex flex-col gap-3 text-caption">
              {[['반영 항목', '원가 · 운영비 4종'], ['원가 추정', '레시피 기준 · 원가율 26%'], ['월 비용 배분', '적용 기간에 따라 일할 계산']].map(([label, value]) => <div key={label} className="flex justify-between gap-3"><dt className="text-ink-sub">{label}</dt><dd className="text-right font-medium text-ink">{value}</dd></div>)}
            </dl>
            <p className="rounded-lg bg-warning-bg p-3 text-caption text-warning">포장재 단가 일부가 누락되어 있어요. 비용이 보완되면 예상 이익이 달라질 수 있어요.</p>
          </Card>
        </div>
      </div>
    </Screen>
  )
}
