import { useStoreInfo } from '@/features/store/queries'

const seoulTime = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Seoul', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })

/** 지금 영업 상태 — 영업시간은 'HH:MM' 문자열이라 그대로 비교한다 */
function openState(hours, now = new Date()) {
  if (!hours) return { label: '오늘 휴무', open: false }
  const t = seoulTime.format(now)
  if (t < hours.open) return { label: '영업 전', open: false }
  if (t >= hours.close) return { label: '영업 종료', open: false }
  return { label: '영업 중', open: true }
}

/** 홈 인사 줄 — 'OO 사장님, 안녕하세요' + 영업 상태 */
export default function StoreLine() {
  const { data: store } = useStoreInfo()
  const state = openState(store.hours)
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1.5">
      <p className="min-w-0 break-words text-[20px] leading-snug font-bold text-ink lg:text-[24px]">
        {store.owner} 사장님, 안녕하세요
      </p>
      <span
        className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-label font-bold ${
          state.open ? 'bg-success-bg text-success' : 'bg-surface-muted text-ink-sub'
        }`}
      >
        {state.open && <span aria-hidden="true" className="size-2 animate-pulse rounded-full bg-success" />}
        {state.label}
      </span>
      {store.hours && (
        <span className="text-label text-ink-mute">
          {store.hours.open}–{store.hours.close}
        </span>
      )}
    </div>
  )
}
