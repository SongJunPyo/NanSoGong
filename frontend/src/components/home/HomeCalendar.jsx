import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Dialog } from 'radix-ui'
import { ChevronLeft, ChevronRight, Plus, X } from 'lucide-react'
import { useIsDesktop } from '@/hooks/useViewport'
import { HOME_EVENT_TYPES, getCalendarDays, getHomeEventsForDate, shiftCalendarMonth } from '@/utils/home'
import { formatCalendarDate, formatCalendarMonth, todayDateKey } from '@/utils/format'
import { Skeleton } from '@/components/ui/loading'

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

// 'YYYY-MM-DD' 날짜 계산 (시간대 영향을 받지 않게 UTC 로)
const toUtc = (key) => {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d))
}
const weekdayOf = (key) => WEEKDAYS[toUtc(key).getUTCDay()]
const shiftDay = (key, offset) => {
  const date = toUtc(key)
  date.setUTCDate(date.getUTCDate() + offset)
  return date.toISOString().slice(0, 10)
}
const rangeText = (event) =>
  event.startDate === event.endDate
    ? formatCalendarDate(event.startDate)
    : `${formatCalendarDate(event.startDate)} – ${formatCalendarDate(event.endDate)}`

export default function HomeCalendar({ events, isPending, error }) {
  const today = todayDateKey()
  const [month, setMonth] = useState(() => `${today.slice(0, 7)}-01`)
  const [selected, setSelected] = useState(today)
  const [popupOpen, setPopupOpen] = useState(false)

  // 날짜를 누르면 그 날짜 팝업을 연다
  const openDay = (date) => {
    setSelected(date)
    setPopupOpen(true)
  }
  // 팝업 안에서 다른 날로 옮기면 달력도 그 달로 따라간다
  const moveDay = (date) => {
    setSelected(date)
    setMonth(`${date.slice(0, 7)}-01`)
  }

  function moveMonth(offset) {
    const next = shiftCalendarMonth(month, offset)
    setMonth(next)
    setSelected(next)
  }

  return (
    <section data-coach="home-calendar" aria-labelledby="home-calendar-title" className="min-w-0 self-start rounded-card border border-line bg-white p-4">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <h2 id="home-calendar-title" className="text-h2 font-bold text-ink">운영 캘린더</h2>
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
              onClick={() => openDay(date)}
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

      <DayPopup
        open={popupOpen}
        onOpenChange={setPopupOpen}
        date={selected}
        today={today}
        events={getHomeEventsForDate(events, selected)}
        isPending={isPending}
        error={error}
        onMove={moveDay}
      />
    </section>
  )
}

/** 날짜 팝업 — 그날 일정 목록 + 오른쪽 아래 [+] 로 그날 일정 추가 (웹: 가운데 창 / 앱: 바텀시트) */
function DayPopup({ open, onOpenChange, date, today, events, isPending, error, onMove }) {
  const desktop = useIsDesktop()
  const isToday = date === today

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="animate-fade-in fixed inset-0 z-[60] bg-black/45" />
        <Dialog.Content
          className={`fixed z-[60] flex flex-col bg-white shadow-xl outline-none ${
            desktop
              ? 'animate-toast-top top-1/2 left-1/2 h-[min(560px,80dvh)] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-card'
              : 'animate-sheet-in inset-x-0 bottom-0 h-[70dvh] rounded-t-[20px] pb-[env(safe-area-inset-bottom)]'
          }`}
        >
          {!desktop && <span aria-hidden="true" className="mx-auto mt-2.5 h-1 w-10 shrink-0 rounded-full bg-line" />}
          <div className="flex items-center gap-1 px-5 pt-4 pb-3 lg:px-6 lg:pt-6">
            <button type="button" aria-label="전날" onClick={() => onMove(shiftDay(date, -1))} className="-ml-2 flex size-9 items-center justify-center rounded-lg text-ink-sub hover:bg-surface-muted">
              <ChevronLeft size={20} aria-hidden="true" />
            </button>
            <Dialog.Title className="flex items-baseline gap-2 text-[24px] font-bold text-ink">
              {formatCalendarDate(date)} {weekdayOf(date)}
              {isToday && <span className="rounded-md bg-woori-tint px-1.5 py-0.5 text-caption font-bold text-woori-deep">오늘</span>}
            </Dialog.Title>
            <button type="button" aria-label="다음 날" onClick={() => onMove(shiftDay(date, 1))} className="flex size-9 items-center justify-center rounded-lg text-ink-sub hover:bg-surface-muted">
              <ChevronRight size={20} aria-hidden="true" />
            </button>
            <Dialog.Close aria-label="닫기" className="ml-auto rounded-md p-1.5 text-ink-mute hover:bg-surface-muted hover:text-ink">
              <X size={20} />
            </Dialog.Close>
          </div>
          <Dialog.Description className="sr-only">{formatCalendarDate(date)} 일정</Dialog.Description>

          <div aria-live="polite" className="min-h-0 flex-1 overflow-y-auto px-5 pb-24 lg:px-6">
            {error ? (
              <p role="alert" className="text-label text-danger">{error.message}</p>
            ) : isPending ? (
              <div role="status" aria-label="일정을 불러오는 중이에요" className="flex flex-col gap-3 pt-2">
                <Skeleton className="h-5 w-3/5" />
                <Skeleton className="h-5 w-2/5" />
              </div>
            ) : events.length ? (
              <ul className="flex flex-col">
                {events.map((event) => (
                  <li key={event.id} className="flex items-start gap-3 border-b border-line py-3.5 last:border-b-0">
                    <span aria-hidden="true" className={`mt-1 size-4 shrink-0 rounded-[5px] ${HOME_EVENT_TYPES[event.type].dot}`} />
                    <div className="min-w-0">
                      <p className="text-body font-bold text-ink">{event.title}</p>
                      <p className="mt-0.5 text-label text-ink-sub">
                        {rangeText(event)} · {HOME_EVENT_TYPES[event.type].label}
                      </p>
                      {event.description && <p className="mt-0.5 text-caption text-ink-mute">{event.description}</p>}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="pt-6 text-center text-label text-ink-sub">이 날은 일정이 없어요.</p>
            )}
          </div>

          {!isToday && (
            <button
              type="button"
              onClick={() => onMove(today)}
              className="absolute bottom-6 left-1/2 flex h-11 -translate-x-1/2 items-center gap-1 rounded-full bg-woori-blue px-5 text-label font-bold text-white shadow-lg"
            >
              오늘 <ChevronRight size={16} aria-hidden="true" />
            </button>
          )}
          <Link
            to={`/schedule/new?date=${date}`}
            aria-label={`${formatCalendarDate(date)}에 일정 추가`}
            className="absolute right-5 bottom-5 flex size-14 items-center justify-center rounded-full bg-woori-blue text-white shadow-lg transition-transform hover:scale-105 lg:right-6 lg:bottom-6"
          >
            <Plus size={28} aria-hidden="true" />
          </Link>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
