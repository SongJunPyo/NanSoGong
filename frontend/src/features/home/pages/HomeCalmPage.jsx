import { CircleCheck } from 'lucide-react'
import { Screen } from '@/components/common/layout'
import {
  Button,
  Card,
  H2,
  HeadRow,
  Hero,
  HeroLabel,
  HeroValue,
  KV,
  ListRow,
  P,
  Pill,
  SectionHead,
} from '@/components/common/ui'
import StoreLine from '@/features/home/components/StoreLine'

/** 11-2 홈 — 긴급한 일이 없을 때 (UF-05 홈 표시 기준) */
export default function HomeCalmPage() {
  return (
    <Screen title="오늘의 매장 운영" back={false} settings tab wide>
      <StoreLine date="11.24 화" weather={{ type: 'sun', label: '맑음 7°C' }} />
      <div className="grid min-w-0 gap-4 md:grid-cols-2 lg:gap-6">
        <Hero className="justify-center md:min-h-48 md:p-6">
          <HeroLabel>오늘 매출</HeroLabel>
          <HeroValue size="text-display lg:text-[40px]">305,000원</HeroValue>
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-label">
            <span className="text-[#d9ebfa]">주문 41건 · 오후 3시 기준</span>
            <span className="ml-auto font-bold text-white">지난주보다 2.1% ↑</span>
          </div>
        </Hero>
        <Card tone="ok" className="justify-center">
          <div className="flex items-center gap-2.5">
            <CircleCheck size={28} className="shrink-0 text-white" fill="var(--color-success)" />
            <div className="min-w-0">
              <p className="text-[17px] font-bold text-ink">오늘은 급한 일이 없어요</p>
              <P small>재고·발주·입고 모두 정상이에요</P>
            </div>
          </div>
        </Card>
      </div>
      <div className="grid min-w-0 gap-4 md:grid-cols-2 lg:gap-6">
        <section aria-label="오늘의 운영 제안" className="flex min-w-0 flex-col gap-4">
          <SectionHead title="오늘의 운영 제안" action="전체 보기 ›" to="/suggestions" />
          <Card gap="gap-0" pad="px-4 py-1">
            <ListRow title="① 축제 대비 컵 200개 확보" value="발주" to="/orders/recommendation" />
            <ListRow title="② 바닐라 시럽 D-3, 먼저 쓰기" value="재고" to="/inventory" />
            <ListRow title="③ 라떼 세트 사용률 40%" value="프로모션" to="/sales/promotions" />
          </Card>
          <Card tone="line">
            <H2>지금 매장 상태</H2>
            <KV label="재고" value="모든 품목 충분" tone="ok" />
            <KV label="발주" value="진행 중 1건 · 배송 중" />
            <KV label="프로모션" value="운영 중 1건" />
            <KV label="다음 입고" value="11.25 (수) 우유 10개" />
          </Card>
        </section>
        <Card tone="amber" className="self-start">
          <HeadRow title="보완하면 더 정확해져요" size="text-base">
            <Pill tone="amberWhite">데이터 부족</Pill>
          </HeadRow>
          <P tone="ink">레시피가 비어 있는 메뉴 2개는 원가와 재료 사용량을 계산하지 못하고 있어요.</P>
          <Button variant="outline" to="/menu/latte/edit">
            레시피 채우기
          </Button>
        </Card>
      </div>
    </Screen>
  )
}
