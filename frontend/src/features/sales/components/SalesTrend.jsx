import { useId, useState } from 'react'
import { Clock3, TrendingUp } from 'lucide-react'
import { Card, H2, Pill } from '@/components/common/ui'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { won } from '@/lib/format'
import { formatSalesDate, salesDateRangeLabel, smoothSalesPath } from '@/features/sales/analytics'
import SalesDateRange from '@/features/sales/components/SalesDateRange'

function HourlySales({ hours }) {
  const [metric, setMetric] = useState('amount')
  const peak = hours.reduce((best, hour) => hour[metric] > best[metric] ? hour : best, hours[0])
  const maximum = Math.max(...hours.map((hour) => hour[metric]), 1)
  const unit = metric === 'amount' ? '원' : '건'

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-input bg-woori-tint p-4">
        <div>
          <p className="mb-1 flex items-center gap-1.5 text-caption text-ink-sub"><Clock3 size={14} aria-hidden="true" />가장 바쁜 시간</p>
          <p className="text-body font-bold text-woori-deep">{peak.hour}시 <span className="mx-1 text-ink-mute">·</span> 평균 {won(peak[metric])}{unit}</p>
        </div>
        <div className="w-36">
          <SegmentedControl label="시간대 매출 표시 기준" size="sm" value={metric} onChange={setMetric} items={[{ value: 'amount', label: '금액' }, { value: 'orders', label: '건수' }]} />
        </div>
      </div>
      <div className="flex items-center justify-between text-caption text-ink-sub">
        <span>시간대별 하루 평균</span><span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-woori-blue" />매장(POS) · {metric === 'amount' ? '원' : '건'}</span>
      </div>
      <ol className="flex flex-col gap-2" aria-label="시간대별 평균 매장 매출">
        {hours.map((hour) => (
          <li key={hour.hour} className="grid grid-cols-[2rem_1fr_5rem] items-center gap-3 sm:grid-cols-[2.5rem_1fr_6rem]">
            <span className={`text-caption ${hour.hour === peak.hour ? 'font-bold text-woori-deep' : 'text-ink-sub'}`}>{hour.hour}시</span>
            <div className="h-5 overflow-hidden rounded-md bg-surface-muted" aria-hidden="true">
              <div className={`h-full rounded-md transition-[width] duration-300 ${hour.hour === peak.hour ? 'bg-woori-deep' : 'bg-[#a9d4ef]'}`} style={{ width: `${hour[metric] / maximum * 100}%` }} />
            </div>
            <span className={`num text-right text-caption sm:text-label ${hour.hour === peak.hour ? 'font-bold text-woori-deep' : 'text-ink'}`}>{won(hour[metric])}{unit}</span>
          </li>
        ))}
      </ol>
    </div>
  )
}

function DailySales({ days }) {
  const [active, setActive] = useState(null)
  const gradientId = `sales-area-${useId().replaceAll(':', '')}`
  const tooltipId = `${gradientId}-tooltip`
  const ceiling = Math.max(100000, Math.ceil(Math.max(...days.map((day) => day.amount)) / 100000) * 100000)
  const points = days.map((day, index) => ({
    ...day,
    x: days.length === 1 ? 400 : 16 + index / (days.length - 1) * 768,
    y: 224 - day.amount / ceiling * 200,
  }))
  const selected = active === null ? null : points[Math.min(active, points.length - 1)]
  const path = smoothSalesPath(points)
  const labels = [...new Set([0, Math.floor((days.length - 1) / 2), days.length - 1])]
  const selectAtPointer = (event) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const position = ((event.clientX - rect.left) / rect.width * 800 - 16) / 768
    setActive(Math.max(0, Math.min(days.length - 1, Math.round(position * (days.length - 1)))))
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-input bg-woori-tint p-4">
        <div>
          <p className="mb-1 text-caption text-ink-sub">기간 내 일평균 매출</p>
          <p className="num text-xl font-bold text-woori-deep">{won(Math.round(days.reduce((sum, day) => sum + day.amount, 0) / days.length))}<span className="ml-1 text-label">원</span></p>
        </div>
        <span className="flex items-center gap-1.5 text-caption text-ink-sub"><span className="size-2 rounded-full bg-woori-blue" />매장(POS)</span>
      </div>
      <div className="relative mt-2 pl-10 sm:pl-12">
        <div aria-hidden="true" className="absolute top-0 left-0 h-60 text-[10px] text-ink-sub sm:text-caption">
          {[1, 0.75, 0.5, 0.25, 0].map((ratio, index) => <span key={ratio} className="absolute -translate-y-1/2 whitespace-nowrap" style={{ top: `${24 + index * 50}px` }}>{won(ceiling * ratio / 10000)}만</span>)}
        </div>
        <div
          role="group"
          tabIndex={0}
          aria-label="날짜별 매장 매출 그래프. 좌우 방향키로 날짜를 확인하세요."
          aria-describedby={selected ? tooltipId : undefined}
          onPointerMove={selectAtPointer}
          onPointerDown={(event) => {
            event.currentTarget.focus({ preventScroll: true })
            selectAtPointer(event)
          }}
          onPointerLeave={(event) => { if (event.pointerType === 'mouse') setActive(null) }}
          onFocus={() => setActive(days.length - 1)}
          onBlur={() => setActive(null)}
          onKeyDown={(event) => {
            if (event.key === 'Escape') { setActive(null); return }
            if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
            event.preventDefault()
            setActive((current) => event.key === 'Home' ? 0 : event.key === 'End' ? days.length - 1 : Math.max(0, Math.min(days.length - 1, (current ?? 0) + (event.key === 'ArrowRight' ? 1 : -1))))
          }}
          className="relative h-64 touch-pan-y rounded-input outline-none focus-visible:ring-2 focus-visible:ring-woori-blue"
        >
          <svg aria-hidden="true" viewBox="0 0 800 240" preserveAspectRatio="none" className="h-60 w-full overflow-visible">
            <defs><linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--color-woori-blue)" stopOpacity="0.25" /><stop offset="100%" stopColor="var(--color-woori-blue)" stopOpacity="0.02" /></linearGradient></defs>
            {[24, 74, 124, 174, 224].map((y) => <line key={y} x1="0" x2="800" y1={y} y2={y} stroke="var(--color-line)" strokeDasharray="4 5" />)}
            <path d={`${path} L ${points.at(-1).x} 224 L ${points[0].x} 224 Z`} fill={`url(#${gradientId})`} />
            <path d={path} fill="none" stroke="var(--color-woori-blue)" strokeWidth="3" vectorEffect="non-scaling-stroke" />
            {points.length === 1 && <circle cx={points[0].x} cy={points[0].y} r="4" fill="var(--color-woori-blue)" />}
            {selected && <>
              <line x1={selected.x} x2={selected.x} y1="14" y2="224" stroke="var(--color-woori-blue)" strokeDasharray="4 4" />
              <circle cx={selected.x} cy={selected.y} r="5" fill="var(--color-woori-blue)" stroke="white" strokeWidth="2" />
            </>}
          </svg>
          {selected && (
            <div id={tooltipId} role="tooltip" className="pointer-events-none absolute top-0 z-10 w-40 -translate-x-1/2 rounded-input bg-ink px-3 py-2.5 text-caption text-white shadow-lg" style={{ left: `clamp(80px, ${selected.x / 8}%, calc(100% - 80px))` }}>
              <p className="mb-1 font-bold">{formatSalesDate(selected.date)}</p>
              <p>매장(POS): <span className="num font-bold">{won(selected.amount)}원</span></p>
            </div>
          )}
        </div>
        <div aria-hidden="true" className="flex justify-between text-[11px] text-ink-sub">{labels.map((index) => <span key={index}>{formatSalesDate(days[index].date)}</span>)}</div>
      </div>
      <p className="text-caption text-ink-sub">그래프에 마우스를 올리거나 터치하면 날짜별 매출을 확인할 수 있어요.</p>
      <table className="sr-only"><caption>날짜별 매장(POS) 매출</caption><thead><tr><th>날짜</th><th>매출</th></tr></thead><tbody>{days.map((day) => <tr key={day.date}><td>{day.date}</td><td>{won(day.amount)}원</td></tr>)}</tbody></table>
    </div>
  )
}

export default function SalesTrend({ analytics, summary, range, onRangeChange }) {
  const [view, setView] = useState('hour')
  return (
    <Card tone="line" gap="gap-5" pad="p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><H2><span className="flex items-center gap-2"><TrendingUp size={19} className="text-woori-blue" aria-hidden="true" />매출 추이</span></H2><p className="mt-1 text-caption text-ink-sub">{salesDateRangeLabel(range)} · 매장 판매 기준</p></div>
        <SalesDateRange range={range} onChange={onRangeChange} availableFrom={analytics.availableFrom} availableTo={analytics.availableTo} />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="w-48"><SegmentedControl label="매출 추이 보기" value={view} onChange={setView} items={[{ value: 'hour', label: '시간대' }, { value: 'date', label: '날짜' }]} /></div>
        <Pill tone="gray">수집된 {summary.days.length}일 기준</Pill>
      </div>
      {summary.days.length === 0 ? <p role="status" className="py-16 text-center text-label text-ink-sub">선택한 기간에 수집된 매출 자료가 없어요.</p>
        : view === 'hour' ? <HourlySales key={`${range.from}-${range.to}`} hours={summary.hours} />
          : <DailySales key={`${range.from}-${range.to}`} days={summary.days} />}
      <p className="border-t border-line pt-3 text-caption text-ink-sub">POS 결제 금액에서 프로모션 할인을 뺀 실제 매장 매출이에요. 시간대는 수집된 날짜의 하루 평균을 보여줘요.</p>
    </Card>
  )
}
