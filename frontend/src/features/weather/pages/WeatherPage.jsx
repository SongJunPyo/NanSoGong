import { Screen } from '@/components/common/layout'
import { Eyebrow, H1 } from '@/components/common/ui'
import WeatherDetail from '@/features/weather/components/WeatherDetail'

/** 12 날씨·수요 예측 — 홈에서는 같은 내용을 팝업으로 연다 */
export default function WeatherPage() {
  return (
    <Screen title="날씨·수요 예측">
      <Eyebrow>성수동 기준 · 기상청 예보</Eyebrow>
      <H1>{'이번 주는 비 소식이\n두 번 있어요'}</H1>
      <WeatherDetail />
    </Screen>
  )
}
