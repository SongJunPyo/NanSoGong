import { useState } from 'react'
import { Screen } from '@/components/common/layout'
import { Card, H2, HeadRow, KV, P, Pill } from '@/components/common/ui'
import { cn } from '@/lib/utils'
import { won } from '@/lib/format'
import { WeekHeader } from '@/features/sales/components/CalendarParts'
import { WEEK } from '@/features/sales/constants'
import { useSalesByDay } from '@/features/sales/queries'

/** 2026년 11월 달력 칸 (11/1 = 일요일, 30일) */
const novemberCells = () => Array.from({ length: 35 }, (_, i) => (i < 30 ? i + 1 : null))

/** 42 매출 캘린더 (UF-17 4) */
export default function SalesCalendarPage() {
  const { data: byDay } = useSalesByDay()
  const [selected, setSelected] = useState(18)
  const total = Object.values(byDay).reduce((a, b) => a + b, 0)
  const pct = (a, b) => Math.round(((a - b) / b) * 100)
  const sel = byDay[selected]
  const prev = byDay[selected - 1]
  const lastWeek = byDay[selected - 7]
  const arrow = (n) => `${Math.abs(n)}% ${n >= 0 ? '↑' : '↓'}`
  return (
    <Screen title="매출 캘린더">
      <HeadRow title="2026년 11월">
        <Pill>월 누적 {won(total)}원</Pill>
      </HeadRow>
      <WeekHeader />
      <div className="grid grid-cols-7 gap-0.5">
        {novemberCells().map((d, i) => {
          const amount = d ? byDay[d] : null
          const on = d === selected
          return (
            <button
              key={i}
              type="button"
              disabled={!amount}
              onClick={() => setSelected(d)}
              className={cn('flex flex-col items-center gap-[3px] rounded-[10px] py-2', on && 'bg-woori-deep')}
            >
              <span className={cn('text-[13px] font-bold', on ? 'text-white' : amount ? 'text-ink' : 'text-ink-mute')}>
                {d ?? ''}
              </span>
              <span className={cn('num text-[10px] font-medium tracking-tight', on ? 'text-white' : 'text-woori-blue')}>
                {amount ? won(amount) : ' '}
              </span>
            </button>
          )
        })}
      </div>
      <P tone="mute" small>
        날짜 아래 숫자는 그날 매출액(원)이에요.
      </P>
      <Card>
        <H2>
          11.{selected} ({WEEK[(selected - 1) % 7]})
        </H2>
        <KV label="매출액" value={`${won(sel)}원`} />
        <KV
          label="주문 · 객단가"
          value={`${Math.round(sel / 7776)}건 · ${won(Math.round(sel / Math.round(sel / 7776)))}원`}
        />
        {prev && <KV label="전일 대비" value={arrow(pct(sel, prev))} tone={sel >= prev ? 'deep' : 'warn'} />}
        {lastWeek && (
          <KV
            label="지난주 같은 요일 대비"
            value={arrow(pct(sel, lastWeek))}
            tone={sel >= lastWeek ? 'deep' : 'warn'}
          />
        )}
      </Card>
    </Screen>
  )
}
