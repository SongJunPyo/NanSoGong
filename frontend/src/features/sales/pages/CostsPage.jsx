import { Screen } from '@/components/common/layout'
import { Button, Card, Chips, H2, Hero, HeroLabel, HeroValue, KV, KV2 } from '@/components/common/ui'
import { useCosts } from '@/features/sales/queries'

/** 43 비용·예상 이익 (UF-18) */
export default function CostsPage() {
  const { data: costs } = useCosts()
  return (
    <Screen title="비용·예상 이익">
      <Chips items={['이번 달', '지난 달', '기간 지정']} />
      <Hero>
        <HeroLabel>11월 예상 이익 (월말 추정)</HeroLabel>
        <HeroValue size="text-[30px]">3,881,600원</HeroValue>
        <p className="text-xs text-[#d9ebfa]">매출 12,840,000 − 추정 원가 3,338,400 − 운영비 5,620,000</p>
      </Hero>
      <Card tone="line">
        <H2>운영 비용</H2>
        {costs.map((c) => (
          <KV2 key={c.title} {...c} />
        ))}
        <div>
          <Button variant="text" to="/sales/costs/new">
            + 비용 추가
          </Button>
        </div>
      </Card>
      <Card tone="amber">
        <H2>확인이 필요한 거래 2건</H2>
        <KV2 title="11.15 출금 · 김○○" sub="인건비인지 확인해 주세요" value="850,000원" tone="amber" />
        <KV2 title="11.10 출금 · 관리비" sub="공과금과 중복일 수 있어요" value="120,000원" tone="amber" />
        <Button variant="outline" to="/sales/costs/classify">
          분류 확인하기
        </Button>
      </Card>
      <Card>
        <H2>계산 기준</H2>
        <KV label="반영된 항목" value="원가 · 운영비 4종" />
        <KV label="누락된 항목" value="포장재 단가 일부" tone="amber" />
        <KV label="원가" value="레시피 기준 추정" />
        <KV label="월 비용 배분" value="일할 계산" />
        <KV label="원가율" value="26%" tone="deep" />
      </Card>
    </Screen>
  )
}
