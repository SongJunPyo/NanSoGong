import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { HOME_EVENT_TYPES, getCalendarDays, getHomeEventsForDate, shiftCalendarMonth } from '@/utils/home'
import { formatCalendarDate, formatCalendarMonth, todayDateKey } from '@/utils/format'
import { Skeleton } from '@/components/ui/loading'

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

export default function HomeCalendar({ events, isPending, error }) {
  const today = todayDateKey()
  const [month, setMonth] = useState(() => `${today.slice(0, 7)}-01`)
  const [selected, setSelected] = useState(today)
  const selectedEvents = getHomeEventsForDate(events, selected)

  function moveMonth(offset) {
    const next = shiftCalendarMonth(month, offset)
    setMonth(next)
    setSelected(next)
  }

  return (
    <section data-coach="home-calendar" aria-labelledby="home-calendar-title" className="min-w-0 self-start rounded-card border border-line bg-white p-4">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <h2 id="home-calendar-title" className="text-h2 font-bold text-ink">운영 캘린더</h2>
        <Link to="/schedule/new" className="ml-auto text-caption font-bold text-woori-blue">+ 일정 추가</Link>
      </div>

      <div className="mb-2 grid grid-cols-[1fr_auto_1fr] items-center gap-1">
        <button type="button" aria-label="이전 달" onClick={() => moveMonth(-1)} className="flex size-8 items-center justify-center rounded-lg text-ink-sub hover:bg-surface-muted">
          <ChevronLeft size={18} aria-hidden="true" />
        </button>
        <h3 aria-live="polite" className="text-label font-bold text-ink">{formatCalendarMonth(month)}</h3>
        <div className="flex items-center justify-end gap-1">
          <button type="button" onClick={() => { const current = todayDateKey(); setMonth(`${current.slice(0, 7)}-01`); setSelected(current) }} className="rounded-md bg-woori-tint px-2 py-1 text-caption font-bold text-woori-deep">오늘</button>
          <button type="button" aria-label="다음 달" onClick={() => moveMonth(1)} className="flex size-8 items-center justify-center rounded-lg text-ink-sub hover:bg-surface-muted">
            <ChevronRight size={18} aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7" aria-hidden="true">
        {WEEKDAYS.map((day, index) => <span key={day} className={`pb-1 text-center text-caption ${index === 0 ? 'text-danger' : index === 6 ? 'text-woori-blue' : 'text-ink-mute'}`}>{day}</span>)}
      </div>
      <div role="group" aria-label={formatCalendarMonth(month)} className="grid grid-cols-7 gap-0.5">
        {getCalendarDays(month).map((date) => {
          const inMonth = date.slice(0, 7) === month.slice(0, 7)
          const dayEvents = getHomeEventsForDate(events, date)
          const types = [...new Set(dayEvents.map((event) => event.type))]
          const isSelected = selected === date
          const isToday = date === today
          return (
            <button
              key={date} type="button" disabled={!inMonth} aria-pressed={isSelected}
              aria-current={isToday ? 'date' : undefined}
              aria-label={`${date.replaceAll('-', ' ')}${isToday ? ' 오늘' : ''}, 일정 ${dayEvents.length}건`}
              onClick={() => setSelected(date)}
              className={`flex min-h-9 flex-col items-center justify-center gap-0.5 rounded-lg py-1 text-[13px] focus-visible:outline-2 focus-visible:outline-woori-blue ${
                isToday ? 'bg-woori-deep font-bold text-white' :
                  isSelected ? 'bg-woori-tint font-bold text-woori-deep ring-1 ring-inset ring-woori-blue' :
                    inMonth ? 'text-ink hover:bg-surface-muted' : 'text-ink-mute/50'
              } ${isToday && isSelected ? 'ring-2 ring-woori-blue ring-offset-1' : ''}`}
            >
              {Number(date.slice(8))}
              <span aria-hidden="true" className="flex h-1.5 items-center gap-0.5">
                {types.map((type) => <span key={type} className={`size-1 rounded-full ${HOME_EVENT_TYPES[type].dot} ${isToday ? 'ring-1 ring-white/70' : ''}`} />)}
              </span>
            </button>
          )
        })}
      </div>

      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-ink-sub">
        {Object.entries(HOME_EVENT_TYPES).map(([key, type]) => (
          <span key={key} className="inline-flex items-center gap-1"><span aria-hidden="true" className={`size-1.5 rounded-full ${type.dot}`} />{type.label}</span>
        ))}
      </div>

      <div aria-live="polite" aria-label="선택한 날짜의 일정" className="mt-3 min-h-20 border-t border-line pt-2.5">
        <h3 className="mb-1.5 text-caption font-bold text-ink">{formatCalendarDate(selected)}{selected === today ? ' · 오늘' : ''}</h3>
        {error ? <p role="alert" className="text-caption text-danger">{error.message}</p> : isPending ? (
          <div role="status" aria-label="일정을 불러오는 중이에요" className="flex flex-col gap-2">
            <Skeleton className="h-3.5 w-4/5" />
            <Skeleton className="h-3.5 w-3/5" />
          </div>
        ) : selectedEvents.length ? (
          <ul className="space-y-1.5">
            {selectedEvents.map((event) => (
              <li key={event.id} className="flex items-start gap-2 text-caption">
                <span aria-hidden="true" className={`mt-1.5 size-1.5 shrink-0 rounded-full ${HOME_EVENT_TYPES[event.type].dot}`} />
                <div className="min-w-0"><span className="font-bold text-ink">{event.title}</span><span className="ml-1.5 text-ink-sub">{event.description}</span></div>
              </li>
            ))}
          </ul>
        ) : <p className="text-caption text-ink-sub">등록된 일정이 없어요.</p>}
      </div>
    </section>
  )
}
