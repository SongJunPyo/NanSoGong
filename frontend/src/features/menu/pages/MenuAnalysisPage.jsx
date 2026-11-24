import { CloudRain } from 'lucide-react'
import { Screen } from '@/components/common/layout'
import { BarChart, Card, Chips, H2, KV } from '@/components/common/ui'
import MenuTabs from '@/features/menu/components/MenuTabs'

/** 33 메뉴 판매 분석 (UF-16 1) */
export default function MenuAnalysisPage() {
  return (
    <Screen title="판매 분석">
      <MenuTabs />
      <Chips items={['일', '주', '월', '직접 선택']} defaultIndex={1} />
      <Card tone="line">
        <H2>이번 주 판매량</H2>
        <BarChart
          values={[52, 61, 48, 70, 66, 90, 84]}
          highlight={5}
          labels={['목', '금', '토', '일', '월', '화', '수']}
          height={120}
        />
      </Card>
      <Card>
        <H2>인기 메뉴</H2>
        <KV label="1. 아이스 아메리카노" value="212잔 · 6% ↑" tone="deep" />
        <KV label="2. 카페라떼" value="140잔 · 2% ↑" tone="deep" />
        <KV label="3. 바닐라 라떼" value="96잔 · 11% ↑" tone="deep" />
      </Card>
      <Card tone="warn">
        <H2>부진 메뉴</H2>
        <KV label="시즌 음료" value="12잔 · 40% ↓" tone="warn" />
      </Card>
      <Card tone="line">
        <p className="flex items-center gap-1.5 text-base font-bold text-ink">
          <CloudRain size={20} className="text-weather-rain" /> 비 오는 날 더 팔린 메뉴
        </p>
        <KV label="바닐라 라떼" value="+34%" tone="deep" />
        <KV label="카페라떼" value="+21%" tone="deep" />
        <KV label="아이스 아메리카노" value="-28%" tone="sub" />
      </Card>
    </Screen>
  )
}
