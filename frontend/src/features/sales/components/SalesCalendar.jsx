import { useState } from 'react'
import { CalendarDays } from 'lucide-react'
import { Card, H2, Pill } from '@/components/common/ui'
import { WeekHeader } from '@/features/sales/components/CalendarParts'
import { WEEK } from '@/features/sales/constants'
import { formatSalesDate } from '@/features/sales/analytics'
import { useSalesAnalytics } from '@/features/sales/queries'
import { won } from '@/lib/format'

export default function SalesCalendar() {
  const { data: analytics } = useSalesAnalytics()
  const [selected, setSelected] = useState('2026-11-18')
  const [year, month] = analytics.defaultRange.from.split('-').map(Number)
  const offset = new Date(Date.UTC(year, month - 1, 1)).getUTCDay()
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate()
  const records = new Map(analytics.days.filter((record) => record.date.startsWith(`${year}-${String(month).padStart(2, '0')}`)).map((record) => [Number(record.date.slice(-2)), record]))
  const cells = Array.from({ length: Math.ceil((offset + daysInMonth) / 7) * 7 }, (_, index) => {
    const day = index - offset + 1
    return day > 0 && day <= daysInMonth ? day : null
  })
  const total = [...records.values()].reduce((sum, day) => sum + day.amount, 0)
  const day = analytics.days.find((record) => record.date === selected)
  const dayNumber = day ? Number(day.date.slice(-2)) : null
  const previous = day ? records.get(dayNumber - 1) : null
  const lastWeek = day ? records.get(dayNumber - 7) : null
  const compare = (record) => record?.amount > 0 ? `${Math.abs((day.amount - record.amount) / record.amount * 100).toFixed(1)}% ${day.amount >= record.amount ? '↑' : '↓'}` : '비교 자료 없음'

  return (
    <Card tone="line" gap="gap-4" pad="p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><H2><span className="flex items-center gap-2"><CalendarDays size={19} className="text-woori-blue" aria-hidden="true" />매출 캘린더</span></H2><p className="mt-1 text-caption text-ink-sub">{year}년 {month}월 · 날짜를 선택해 상세 매출을 확인하세요</p></div>
        <Pill>월 누적 {won(total)}원</Pill>
      </div>
      <WeekHeader />
      <div className="grid grid-cols-7 gap-1">
        {cells.map((number, index) => {
          const record = records.get(number)
          const active = record?.date === selected
          return number === null ? <div key={`blank-${index}`} aria-hidden="true" /> : (
            <button key={number} type="button" disabled={!record} aria-pressed={active}
              aria-label={`${month}월 ${number}일${record ? ` 매출 ${won(record.amount)}원` : ' 자료 없음'}`}
              onClick={() => setSelected(record.date)}
              className={`flex min-h-16 min-w-0 flex-col items-center justify-center gap-2 rounded-input py-2 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-woori-blue sm:min-h-20 ${active ? 'bg-woori-deep text-white' : record ? 'bg-surface-muted text-ink hover:bg-woori-tint' : 'text-ink-mute'}`}>
              <span className="text-caption font-bold sm:text-label">{number}</span>
              <span className={`num text-[9px] tracking-tight sm:text-[11px] ${active ? 'text-white' : 'text-woori-blue'}`}>{record ? won(record.amount) : '—'}</span>
            </button>
          )
        })}
      </div>
      <p className="text-caption text-ink-sub">날짜 아래는 매출액(원)이에요. — 표시는 아직 수집된 자료가 없는 날짜예요.</p>
      {day && (
        <div aria-live="polite" className="rounded-input bg-woori-tint p-4">
          <p className="mb-3 text-label font-bold text-woori-deep">{formatSalesDate(day.date)} ({WEEK[new Date(`${day.date}T12:00:00+09:00`).getUTCDay()]}) 상세 매출</p>
          <dl className="grid grid-cols-3 gap-2 sm:gap-5">
            {[['매출액', `${won(day.amount)}원`], ['주문 수', `${won(day.orders)}건`], ['객단가', `${won(day.orders ? Math.round(day.amount / day.orders) : 0)}원`]].map(([label, value]) => (
              <div key={label}><dt className="mb-1 text-caption text-ink-sub">{label}</dt><dd className="num text-[13px] font-bold text-ink sm:text-lg">{value}</dd></div>
            ))}
          </dl>
          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1 border-t border-woori-deep/10 pt-3 text-caption text-ink-sub">
            <span>전일 대비 <strong className="ml-1 text-woori-deep">{compare(previous)}</strong></span>
            <span>지난주 같은 요일 대비 <strong className="ml-1 text-woori-deep">{compare(lastWeek)}</strong></span>
          </div>
        </div>
      )}
    </Card>
  )
}
