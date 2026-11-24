import { useStoreInfo } from '@/features/store/queries'
import { Badge } from '@/components/ui/badge'

const seoulTime = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Seoul', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })

/** 지금 영업 상태 — 영업시간은 'HH:MM' 문자열이라 그대로 비교한다 */
function openState(hours, now = new Date()) {
  if (!hours) return { label: '오늘 휴무', status: 'neutral' }
  const t = seoulTime.format(now)
  if (t < hours.open) return { label: '영업 전', status: 'neutral' }
  if (t >= hours.close) return { label: '영업 종료', status: 'neutral' }
  return { label: '영업 중', status: 'done' }
}

/** 홈 인사 줄 — 'OO 사장님, 안녕하세요' + 영업 상태 */
export default function StoreLine() {
  const { data: store } = useStoreInfo()
  const state = openState(store.hours)
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
      <p className="min-w-0 break-words text-body font-bold text-ink">{store.owner} 사장님, 안녕하세요</p>
      <Badge status={state.status}>
        {state.status === 'done' && <span aria-hidden="true" className="mr-1 size-1.5 rounded-full bg-success" />}
        {state.label}
      </Badge>
      {store.hours && (
        <span className="text-caption text-ink-mute">
          {store.hours.open}–{store.hours.close}
        </span>
      )}
    </div>
  )
}
