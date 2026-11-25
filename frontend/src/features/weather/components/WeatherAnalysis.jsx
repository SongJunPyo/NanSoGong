import { useEffect, useState } from 'react'
import { RotateCw } from 'lucide-react'
import { useDemandByWeather, useWeekForecast } from '@/features/weather/queries'
import WeatherDetail from '@/features/weather/components/WeatherDetail'
import { AgentSteps } from '@/components/ui/agent-steps'
import { Spinner } from '@/components/ui/loading'

const TICK = 750 // 목업에서 분석 단계 하나가 끝나는 시간 (ms)
const seoulTime = new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })

/**
 * AI 수요 예측 분석 — 단계별로 무엇을 보고 있는지 보여 준 뒤 결과(WeatherDetail)를 띄운다
 * TODO 실제 서비스: 분석 요청 → 단계 상태를 받아 표시 (목업은 타이머로 진행)
 */
export default function WeatherAnalysis({ onNavigate }) {
  const { data: week } = useWeekForecast()
  const { data: d } = useDemandByWeather()
  const [step, setStep] = useState(0)
  const [run, setRun] = useState(0) // '다시 분석' 할 때마다 처음부터
  const [finishedAt, setFinishedAt] = useState(null)

  const rainDays = week.filter((day) => day.w === 'rain').length
  const STEPS = [
    { label: '기상청 예보 불러오기', detail: `성수동 · ${week.length}일 예보 · 비 ${rainDays}번` },
    { label: '최근 4주 판매와 날씨 맞춰 보기', detail: `맑은 날 하루 ${d.sunny}건 · 비 오는 날 ${d.rainy}건` },
    { label: '메뉴별 수요 계산', detail: `비 오는 날 따뜻한 음료 ${d.warmMore}잔 더 · 아이스 ${d.icedLess}잔 덜` },
    { label: '발주 · 프로모션 제안 정리', detail: '날씨를 반영한 제안 3건' },
  ]
  const done = step >= STEPS.length

  useEffect(() => {
    if (step >= STEPS.length) return undefined
    const t = setTimeout(() => {
      if (step === STEPS.length - 1) setFinishedAt(seoulTime.format(new Date()))
      setStep((s) => s + 1)
    }, TICK)
    return () => clearTimeout(t)
  }, [step, run, STEPS.length])

  const restart = () => {
    setFinishedAt(null)
    setStep(0)
    setRun((r) => r + 1)
  }

  const steps = STEPS.map((s, i) => ({
    label: s.label,
    status: i < step ? 'done' : i === step ? 'active' : 'pending',
    detail: i <= step ? s.detail : undefined,
  }))

  if (!done)
    return (
      <div className="flex flex-col gap-4 pb-4" aria-live="polite">
        <div className="flex flex-col items-center gap-2 rounded-card bg-woori-tint px-4 py-6 text-center">
          <Spinner size={32} />
          <p className="text-h2 font-bold text-ink">AI가 수요를 분석하고 있어요</p>
          <p className="text-label text-ink-sub">
            {step + 1} / {STEPS.length} 단계 · {STEPS[step].label}
          </p>
          <div className="mt-1 h-1.5 w-full max-w-[260px] overflow-hidden rounded-full bg-white">
            <div className="h-full rounded-full bg-woori-blue transition-[width] duration-500" style={{ width: `${(step / STEPS.length) * 100}%` }} />
          </div>
        </div>
        <div className="rounded-card border border-line p-4">
          <AgentSteps key={run} steps={steps} label="AI 분석 단계" />
        </div>
      </div>
    )

  return (
    <div className="flex flex-col gap-4 pb-4">
      <div className="flex flex-col gap-3 rounded-card border border-line p-4">
        <div className="flex items-center gap-2">
          <p className="text-label font-bold text-ink">분석을 마쳤어요</p>
          <span className="text-caption text-ink-mute">{finishedAt} 기준</span>
          <button
            type="button"
            onClick={restart}
            className="ml-auto inline-flex items-center gap-1 rounded-md px-2 py-1 text-caption font-bold text-woori-blue hover:bg-woori-tint"
          >
            <RotateCw size={14} aria-hidden="true" />
            다시 분석
          </button>
        </div>
        <AgentSteps steps={steps} stagger={0} label="AI가 본 것" />
      </div>
      <WeatherDetail onNavigate={onNavigate} />
    </div>
  )
}
