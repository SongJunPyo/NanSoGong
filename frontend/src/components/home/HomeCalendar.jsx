import { useState } from 'react'
import { Dialog } from 'radix-ui'
import { ChevronLeft, ChevronRight, Plus, X } from 'lucide-react'
import { useIsDesktop } from '@/hooks/useViewport'
import { HOME_EVENT_TYPES, getCalendarDays, getHomeEventsForDate, shiftCalendarMonth } from '@/utils/home'
import { formatCalendarDate, formatCalendarMonth, todayDateKey } from '@/utils/format'
import { ButtonLoading, Skeleton } from '@/components/ui/loading'
import { InlineError } from '@/components/ui/inline-error'
import { toast } from '@/components/ui/toast'
import { useAddHomeEvent } from '@/features/home/queries'

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
  const todayEvents = getHomeEventsForDate(events, today)

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
    <section data-coach="home-calendar" aria-labelledby="home-calendar-title" className="flex min-w-0 flex-col rounded-card border border-line bg-white p-4 md:flex-1">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <h2 id="home-calendar-title" className="text-h2 font-bold text-ink">운영 캘린더</h2>
      </div>

      <div className="mb-2 grid grid-cols-[1fr_auto_1fr] items-center gap-1">
        <button type="button" aria-label="이전 달" onClick={() => moveMonth(-1)} className="flex size-11 items-center justify-center rounded-lg text-ink-sub hover:bg-surface-muted">
          <ChevronLeft size={18} aria-hidden="true" />
        </button>
        <h3 aria-live="polite" className="text-label font-bold text-ink">{formatCalendarMonth(month)}</h3>
        <div className="flex items-center justify-end gap-1">
          <button type="button" onClick={() => { const current = todayDateKey(); setMonth(`${current.slice(0, 7)}-01`); setSelected(current) }} className="rounded-md bg-woori-tint px-2 py-1 text-caption font-bold text-woori-deep">오늘</button>
          <button type="button" aria-label="다음 달" onClick={() => moveMonth(1)} className="flex size-11 items-center justify-center rounded-lg text-ink-sub hover:bg-surface-muted">
            <ChevronRight size={18} aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7" aria-hidden="true">
        {WEEKDAYS.map((day, index) => <span key={day} className={`pb-1 text-center text-caption ${index === 0 ? 'text-danger' : index === 6 ? 'text-woori-blue' : 'text-ink-mute'}`}>{day}</span>)}
      </div>
      {/* PC: 남은 높이만큼 날짜 칸이 늘어난다 */}
      <div role="group" aria-label={formatCalendarMonth(month)} className="grid grid-cols-7 gap-0.5 md:flex-1 md:auto-rows-fr">
        {getCalendarDays(month).map((date) => {
          const inMonth = date.slice(0, 7) === month.slice(0, 7)
          const dayEvents = getHomeEventsForDate(events, date)
          const types = [...new Set(dayEvents.map((event) => event.type))]
          // 오늘만 꽉 찬 파랑. 다른 날 테두리는 그 날 팝업을 보고 있을 때만
          const isSelected = popupOpen && selected === date && date !== today
          const isToday = date === today
          return (
            <button
              key={date} type="button" disabled={!inMonth} aria-pressed={isSelected}
              aria-current={isToday ? 'date' : undefined}
              aria-label={`${date.replaceAll('-', ' ')}${isToday ? ' 오늘' : ''}, 일정 ${dayEvents.length}건`}
              onClick={() => openDay(date)}
              className={`flex h-full min-h-9 min-w-0 flex-col items-center justify-center gap-0.5 rounded-lg py-1 text-[13px] md:justify-start md:pt-1.5 focus-visible:outline-2 focus-visible:outline-woori-blue ${
                isToday ? 'bg-woori-deep font-bold text-white' :
                  isSelected ? 'bg-woori-tint font-bold text-woori-deep ring-1 ring-inset ring-woori-blue' :
                    inMonth ? 'text-ink hover:bg-surface-muted' : 'text-ink-mute/50'
              } ${isToday && isSelected ? 'ring-2 ring-woori-blue ring-offset-1' : ''}`}
            >
              {Number(date.slice(8))}
              {/* 앱: 점만 / PC: 칸이 커지니 일정 이름을 2개까지 적는다 (점만으로는 무슨 일정인지 알 수 없어서) */}
              <span aria-hidden="true" className="flex h-1.5 items-center gap-0.5 md:hidden">
                {types.map((type) => <span key={type} className={`size-1 rounded-full ${HOME_EVENT_TYPES[type].dot} ${isToday ? 'ring-1 ring-white/70' : ''}`} />)}
              </span>
              <span aria-hidden="true" className="hidden w-full min-w-0 flex-col gap-0.5 px-0.5 md:flex">
                {dayEvents.slice(0, 2).map((event) => (
                  <span key={event.id} className={`flex min-w-0 items-center gap-1 text-left text-[11px] leading-tight ${isToday ? 'text-white' : 'text-[#4B5563]'}`}>
                    <span className={`size-1.5 shrink-0 rounded-full ${HOME_EVENT_TYPES[event.type].dot}`} />
                    <span className="truncate">{event.title}</span>
                  </span>
                ))}
                {dayEvents.length > 2 && <span className={`text-[11px] ${isToday ? 'text-white/80' : 'text-[#4B5563]'}`}>+{dayEvents.length - 2}</span>}
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

      {/* 오늘 일정 — 점만으로는 무슨 일정인지 알 수 없어서 목록으로 함께 보여 준다 */}
      <div aria-label="오늘 일정" className="mt-3 border-t border-line pt-2.5">
        <h3 className="mb-1.5 text-caption font-bold text-ink">오늘 일정 · {formatCalendarDate(today)}</h3>
        {error ? (
          <p role="alert" className="text-caption text-danger">{error.message}</p>
        ) : isPending ? (
          <div role="status" aria-label="일정을 불러오는 중이에요" className="flex flex-col gap-2">
            <Skeleton className="h-3.5 w-4/5" />
            <Skeleton className="h-3.5 w-3/5" />
          </div>
        ) : todayEvents.length ? (
          <ul className="space-y-1">
            {todayEvents.map((event) => (
              <li key={event.id}>
                <button type="button" onClick={() => openDay(today)} className="flex w-full items-start gap-2 rounded-md px-1 py-1 text-left text-caption hover:bg-surface-muted">
                  <span aria-hidden="true" className={`mt-1 size-2 shrink-0 rounded-[3px] ${HOME_EVENT_TYPES[event.type].dot}`} />
                  <span className="min-w-0">
                    <span className="font-bold text-ink">{event.title}</span>
                    <span className="ml-1.5 text-ink-sub">{event.description}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-caption text-ink-sub">오늘은 일정이 없어요.</p>
        )}
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
function DayPopup({ open, onOpenChange, date, today, events, isPending, error, onMove: moveTo }) {
  const desktop = useIsDesktop()
  const isToday = date === today
  const [adding, setAdding] = useState(false) // 팝업 안 일정 추가 입력 칸
  const onMove = (next) => {
    setAdding(false)
    moveTo(next)
  }
  const change = (next) => {
    if (!next) setAdding(false)
    onOpenChange(next)
  }

  return (
    <Dialog.Root open={open} onOpenChange={change}>
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

          <div aria-live="polite" className={`min-h-0 flex-1 overflow-y-auto px-5 lg:px-6 ${adding ? 'pb-4' : 'pb-24'}`}>
            {adding && <AddEventForm key={date} date={date} onDone={() => setAdding(false)} />}
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
            ) : adding ? null : (
              <p className="pt-6 text-center text-label text-ink-sub">이 날은 일정이 없어요.</p>
            )}
          </div>

          {!adding && !isToday && (
            <button
              type="button"
              onClick={() => onMove(today)}
              className="absolute bottom-6 left-1/2 flex h-11 -translate-x-1/2 items-center gap-1 rounded-full bg-woori-blue px-5 text-label font-bold text-white shadow-lg"
            >
              오늘 <ChevronRight size={16} aria-hidden="true" />
            </button>
          )}
          {!adding && (
            <button
              type="button"
              onClick={() => setAdding(true)}
              aria-label={`${formatCalendarDate(date)}에 일정 추가`}
              className="absolute right-5 bottom-5 flex size-14 items-center justify-center rounded-full bg-woori-blue text-white shadow-lg transition-transform hover:scale-105 lg:right-6 lg:bottom-6"
            >
              <Plus size={28} aria-hidden="true" />
            </button>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

// 일정 등록 화면(11-1)과 같은 선택지. 주변 행사는 '지역 행사', 나머지는 '직접 등록' 색으로 표시한다
const EVENT_KINDS = ['주변 행사', '시험·방학', '매장 휴무', '단체 주문', '기타']
const EVENT_IMPACTS = ['손님 많아짐', '손님 줄어듦', '잘 모르겠음']
const TITLE_ERROR_ID = 'day-event-title-error'

/** 팝업 안에서 바로 일정 추가 — 고른 날짜 하루 일정으로 저장한다 */
function AddEventForm({ date, onDone }) {
  const addEvent = useAddHomeEvent()
  const [title, setTitle] = useState('')
  const [kind, setKind] = useState(null) // 미리 고르지 않는다
  const [impact, setImpact] = useState(null)
  const [tried, setTried] = useState(false)
  const titleError = tried && !title.trim() ? '일정 이름을 입력해 주세요' : ''

  const save = (e) => {
    e.preventDefault()
    setTried(true)
    if (!title.trim()) return
    addEvent.mutate(
      {
        title: title.trim(),
        type: kind === '주변 행사' ? 'event' : 'custom',
        startDate: date,
        endDate: date,
        description: [kind ?? '사장님 등록 일정', impact].filter(Boolean).join(' · '),
      },
      {
        onSuccess: () => {
          toast(`${formatCalendarDate(date)}에 일정을 추가했어요`)
          onDone()
        },
        onError: (err) => toast(err.message, { tone: 'error' }),
      },
    )
  }

  const chip = (on) =>
    `rounded-chip px-3 py-1.5 text-[13px] ${on ? 'bg-woori-deep font-bold text-white' : 'bg-surface-muted font-medium text-ink-sub'}`

  return (
    <form onSubmit={save} className="mb-3 flex flex-col gap-3 rounded-card border border-woori-blue/30 bg-woori-tint/40 p-4">
      <p className="text-label font-bold text-ink">{formatCalendarDate(date)} 일정 추가</p>
      <div>
        <label htmlFor="day-event-title" className="mb-1.5 block text-[13px] font-medium text-ink-sub">
          일정 이름
        </label>
        <input
          id="day-event-title"
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="예: 성수 거리 축제"
          aria-invalid={!!titleError || undefined}
          aria-describedby={titleError ? TITLE_ERROR_ID : undefined}
          className={`h-12 w-full rounded-input bg-white px-4 text-body text-ink outline-none placeholder:text-ink-mute ${
            titleError ? 'ring-[1.5px] ring-danger' : 'focus:ring-2 focus:ring-woori-blue'
          }`}
        />
        <InlineError id={TITLE_ERROR_ID}>{titleError}</InlineError>
      </div>
      <div>
        <p className="mb-1.5 text-[13px] font-medium text-ink-sub">종류 (선택)</p>
        <div className="flex flex-wrap gap-1.5">
          {EVENT_KINDS.map((k) => (
            <button key={k} type="button" aria-pressed={kind === k} onClick={() => setKind(kind === k ? null : k)} className={chip(kind === k)}>
              {k}
            </button>
          ))}
        </div>
      </div>
      <div>
        <p className="mb-1.5 text-[13px] font-medium text-ink-sub">예상 영향 (선택)</p>
        <div className="flex flex-wrap gap-1.5">
          {EVENT_IMPACTS.map((k) => (
            <button key={k} type="button" aria-pressed={impact === k} onClick={() => setImpact(impact === k ? null : k)} className={chip(impact === k)}>
              {k}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-1 grid grid-cols-2 gap-2">
        <button type="button" onClick={onDone} className="h-[52px] rounded-button border border-line bg-white text-base font-bold text-ink">
          취소
        </button>
        <ButtonLoading type="submit" loading={addEvent.isPending} loadingText="저장 중">
          저장
        </ButtonLoading>
      </div>
    </form>
  )
}
