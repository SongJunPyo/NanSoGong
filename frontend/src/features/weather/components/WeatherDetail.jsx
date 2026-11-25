import { Card, H2, KV, ListRow, P, WeatherStrip } from '@/components/common/ui'
import { useDemandByWeather, useWeekForecast } from '@/features/weather/queries'

/** 날씨·수요 예측 본문 — 12 날씨 화면과 홈의 날씨 팝업이 함께 쓴다 */
export default function WeatherDetail({ onNavigate }) {
  const { data: week } = useWeekForecast()
  const { data: d } = useDemandByWeather()
  return (
    <div className="flex flex-col gap-4">
      <Card tone="line">
        <WeatherStrip days={week} />
      </Card>
      <Card>
        <H2>날씨별 예상 주문</H2>
        <KV label="맑은 날 하루 평균 주문" value={`${d.sunny}건`} />
        <KV label="비 오는 날 하루 평균 주문" value={`${d.rainy}건 · ${d.sunny - d.rainy}건 적어요`} tone="warn" />
        <KV label="비 오는 날 따뜻한 음료" value={`${d.warmMore}잔 더 팔려요`} tone="deep" />
        <KV label="비 오는 날 아이스 음료" value={`${d.icedLess}잔 덜 팔려요`} tone="sub" />
      </Card>
      <Card>
        <H2>날씨가 반영된 제안</H2>
        <ListRow title="우유·원두 발주 하루 앞당기기" value="발주" to="/orders/recommendation" onClick={onNavigate} />
        <ListRow title="비 오는 오후 라떼 세트" value="프로모션" to="/promotions/latte-set" onClick={onNavigate} />
        <ListRow title="주말 축제 대비 컵 추가 확보" value="재고" to="/inventory" onClick={onNavigate} />
      </Card>
      <P tone="mute" small>
        판매·요일·시간대·날씨·주변 일정을 함께 보고 메뉴별 수요를 예측해요.
      </P>
    </div>
  )
}
