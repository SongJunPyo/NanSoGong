import { useState } from 'react'
import { Screen } from '@/components/common/layout'
import { Card, H2, KV, P, Segmented } from '@/components/common/ui'
import { SALES_TAB_LABELS, SALES_TABS } from '@/features/sales/constants'
import { useMenuSales } from '@/features/sales/queries'
import { SegmentedControl } from '@/components/ui/segmented-control'

const PERIODS = [
  { value: 'day', label: '일' },
  { value: 'week', label: '주' },
  { value: 'month', label: '월' },
]

/** 41-3 메뉴별 판매 (UF-16) — 기간별 인기 · 부진 메뉴 */
export default function SalesMenuPage() {
  const { data } = useMenuSales()
  const [period, setPeriod] = useState('week')
  const d = data[period]

  return (
    <Screen title="매출" back={false} tab wide>
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="w-full md:max-w-sm">
          <Segmented items={SALES_TAB_LABELS} active={2} links={SALES_TABS} />
        </div>
        <div className="w-full md:w-52">
          <SegmentedControl label="기간" size="sm" value={period} onChange={setPeriod} items={PERIODS} />
        </div>
      </div>
      <div className="grid min-w-0 gap-4 md:grid-cols-2 lg:gap-6">
        <Card>
          <H2>인기 메뉴</H2>
          {d.top.map(([name, cups, diff], i) => (
            <KV key={name} label={`${i + 1}. ${name}`} value={`${cups.toLocaleString('ko-KR')}잔 · ${diff}`} tone="deep" />
          ))}
        </Card>
        <Card tone="warn">
          <H2>부진 메뉴</H2>
          {d.low.map(([name, cups, diff]) => (
            <KV key={name} label={name} value={`${cups.toLocaleString('ko-KR')}잔 · ${diff}`} tone="warn" />
          ))}
          <P tone="ink" small>
            부진 메뉴는 메뉴 화면의 AI 추천 › 메뉴 개선에서 바꿀 방법을 볼 수 있어요.
          </P>
        </Card>
      </div>
      <P tone="mute" small>
        잔 수 옆 숫자는 바로 앞 같은 기간과 비교한 차이예요. POS 판매 기준이에요.
      </P>
    </Screen>
  )
}
