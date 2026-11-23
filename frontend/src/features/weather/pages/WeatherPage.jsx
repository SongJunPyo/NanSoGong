import { Screen } from '@/components/common/layout'
import { Card, Eyebrow, H1, H2, KV, ListRow, P, WeatherStrip } from '@/components/common/ui'
import { useWeekForecast } from '@/features/weather/queries'

/** 12 날씨·수요 예측 */
export default function WeatherPage() {
  const { data: week } = useWeekForecast()
  return (
    <Screen title="날씨·수요 예측">
      <Eyebrow>성수동 기준 · 기상청 예보</Eyebrow>
      <H1>{'이번 주는 비 소식이\n두 번 있어요'}</H1>
      <Card tone="line">
        <WeatherStrip days={week} />
      </Card>
      <Card>
        <H2>날씨별 예상 주문</H2>
        <KV label="맑은 날 평균" value="68건" />
        <KV label="비 오는 날 평균" value="61건 · 10% ↓" tone="warn" />
        <KV label="비 오는 날 따뜻한 음료 비중" value="22% ↑" tone="deep" />
        <KV label="비 오는 날 아이스 음료" value="31% ↓" tone="sub" />
      </Card>
      <Card>
        <H2>날씨가 반영된 제안</H2>
        <ListRow title="우유·원두 발주 하루 앞당기기" value="발주" to="/orders/recommendation" />
        <ListRow title="비 오는 오후 라떼 세트" value="프로모션" to="/promotions/latte-set" />
        <ListRow title="주말 축제 대비 컵 추가 확보" value="재고" to="/inventory" />
      </Card>
      <P tone="mute" small>
        판매·요일·시간대·날씨·주변 일정을 함께 보고 메뉴별 수요를 예측해요.
      </P>
    </Screen>
  )
}
