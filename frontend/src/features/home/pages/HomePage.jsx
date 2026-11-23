import { Screen } from '@/components/common/layout'
import {
  Button,
  Card,
  Eyebrow,
  H2,
  Hero,
  HeroLabel,
  HeroValue,
  KV,
  ListRow,
  P,
  Pill,
  SectionHead,
  WeatherStrip,
} from '@/components/common/ui'
import { won } from '@/lib/format'
import StoreLine from '@/features/home/components/StoreLine'
import { useHome } from '@/features/home/queries'

/** 11 홈 — 긴급한 일이 있을 때 (UF-05) */
export default function HomePage() {
  const { data } = useHome()
  return (
    <Screen title="오늘의 매장 운영" back={false} settings tab>
      <StoreLine />
      <Hero>
        <HeroLabel>오늘 매출</HeroLabel>
        <HeroValue>{won(data.sales.amount)}원</HeroValue>
        <div className="flex text-label">
          <span className="text-[#d9ebfa]">주문 {data.sales.orders}건</span>
          <span className="ml-auto font-bold text-white">{data.sales.diff}</span>
        </div>
      </Hero>

      <Card>
        <div className="flex items-center">
          <Eyebrow>날씨 · 수요 예측</Eyebrow>
          <Button variant="text" to="/weather" className="ml-auto">
            자세히
          </Button>
        </div>
        <H2>{'내일 비 소식, 따뜻한 음료가\n더 나갈 거예요'}</H2>
        <P>강수확률 90% · 최저 4°C. 비 오는 평일엔 라떼 주문이 평소보다 22% 많았어요.</P>
        <WeatherStrip days={data.forecast} />
      </Card>

      <SectionHead title="AI가 챙긴 오늘의 할 일" action="전체 보기 ›" to="/suggestions" />
      <Card>
        <Eyebrow tone="warn">긴급 · 재고 부족</Eyebrow>
        <H2>우유가 내일 오전에 부족해요</H2>
        <P>최근 7일 사용량과 내일 비 예보를 반영하면 1.2일 뒤 소진돼요. 우유 12개를 미리 발주하는 게 좋아요.</P>
        <Button to="/suggestions">이유 확인하고 발주 검토</Button>
      </Card>

      <H2>승인할 일 {data.approvals.length}건</H2>
      <Card gap="gap-0" pad="px-4 py-1">
        {data.approvals.map((a) => (
          <ListRow key={a.title} {...a} />
        ))}
      </Card>

      <SectionHead title="최근 실행 결과" action="더 보기 ›" to="/results" />
      <Card tone="line" gap="gap-0" pad="px-4 py-1">
        {data.results.map((r) => (
          <ListRow key={r.title} {...r} />
        ))}
      </Card>

      <SectionHead title="운영 캘린더" action="+ 일정 추가" to="/schedule/new" />
      <Card tone="line" gap="gap-3">
        <WeatherStrip days={data.calendar} />
        <KV label="11.22 토" value="성수 거리 축제 · 수요 +30% 예상" tone="deep" />
        <div className="flex gap-1.5">
          <Pill tone="gray">예정 · 추천안 기간</Pill>
          <Pill tone="blue">운영 중 · POS 반영 확인</Pill>
        </div>
      </Card>
    </Screen>
  )
}
