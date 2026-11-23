import { Screen } from '@/components/common/layout'
import {
  BarChart,
  Card,
  Chips,
  HeadRow,
  Hero,
  HeroLabel,
  HeroValue,
  KV,
  ListRow,
  Pill,
  Segmented,
} from '@/components/common/ui'
import { SALES_TABS } from '@/features/sales/constants'

/** 41 매출 (UF-17 1~3) */
export default function SalesPage() {
  return (
    <Screen title="매출" back={false} tab>
      <Segmented items={['매출', '입출금']} active={0} links={SALES_TABS} />
      <Chips items={['일', '주', '월', '연', '기간 지정']} defaultIndex={2} />
      <Hero>
        <HeroLabel>11월 매출 (1일~19일)</HeroLabel>
        <HeroValue>8,412,000원</HeroValue>
        <div className="flex text-[13px]">
          <span className="text-[#d9ebfa]">주문 1,118건 · 객단가 7,524원</span>
          <span className="ml-auto text-label font-bold text-white">5.1% ↑</span>
        </div>
      </Hero>
      <Card tone="line">
        <HeadRow title="매출 추이" size="text-base">
          <Pill>비교: 10월 같은 기간</Pill>
        </HeadRow>
        <BarChart values={[38, 42, 40, 51, 47, 55, 62, 58, 49, 53, 60, 66]} highlight={11} />
      </Card>
      <Card>
        <KV label="기준 기간" value="11.1–11.19 · 8,412,000원" />
        <KV label="비교 기간" value="10.1–10.19 · 8,003,000원" />
        <KV label="증감" value="+409,000원" tone="deep" />
      </Card>
      <Card tone="line" gap="gap-0" pad="px-4 py-1">
        <ListRow title="매출 캘린더" value="11월" to="/sales/calendar" />
        <ListRow title="비용·예상 이익" value="3,881,600원" to="/sales/costs" />
        <ListRow title="프로모션 성과" value="진행 1건" to="/sales/promotions" />
      </Card>
    </Screen>
  )
}
