import { cn } from '@/lib/utils'
import { won } from '@/lib/format'
import { WEEK } from '@/features/sales/constants'

export const WeekHeader = () => (
  <div className="grid grid-cols-7">
    {WEEK.map((d) => (
      <span key={d} className="text-center text-xs font-medium text-ink-mute">
        {d}
      </span>
    ))}
  </div>
)

/** 입출금 달력 한 주 (15~21일) */
export function CashWeek({ byDay, unknownFrom }) {
  return (
    <div className="grid grid-cols-7 gap-px">
      {[15, 16, 17, 18, 19, 20, 21].map((d) => {
        const v = byDay[d]
        const unknown = unknownFrom && d >= unknownFrom && d <= 19
        return (
          <div
            key={d}
            className={cn('flex flex-col items-center gap-px rounded-[10px] py-1.5', unknown && 'bg-surface-muted')}
          >
            <span className={cn('text-[13px] font-bold', d > 19 ? 'text-ink-mute' : 'text-ink')}>{d}</span>
            {unknown ? (
              <span className="text-[9px] font-bold leading-tight text-ink-mute text-center">
                확인
                <br />
                불가
              </span>
            ) : v ? (
              <>
                <span className="num text-[9px] font-bold tracking-tight text-woori-deep">{won(v[0], true)}</span>
                <span className={cn('num text-[9px] font-bold tracking-tight', v[1] ? 'text-danger' : 'text-ink-mute')}>
                  {won(v[1], true)}
                </span>
              </>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}
