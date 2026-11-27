import { Pill } from '@/components/common/ui'

/**
 * 'AI' 라벨 — AI가 만든 판단 · 예측에만 붙인다 (매출 금액 · 캘린더 같은 사실 데이터에는 붙이지 않는다)
 * 쓰는 곳: 홈 긴급 배너 제목 앞, 우리 매장 현황 제목 옆, 날씨 데이터 기반 수요 예측 제목 옆
 */
export function AiLabel() {
  return (
    <span aria-label="AI가 만든 내용" className="inline-flex shrink-0 align-middle">
      <Pill tone="blue">AI</Pill>
    </span>
  )
}
