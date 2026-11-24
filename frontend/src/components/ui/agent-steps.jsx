import { Check, Circle, LoaderCircle, Pause, X } from 'lucide-react'

const cx = (...a) => a.filter(Boolean).join(' ')

const MARK = {
  done: { icon: Check, color: 'bg-success text-white', text: 'text-ink', sr: '완료' },
  active: { icon: LoaderCircle, color: 'bg-woori-tint text-woori-blue', text: 'font-bold text-woori-deep', sr: '진행 중', spin: true },
  pending: { icon: Circle, color: 'bg-surface-muted text-ink-mute', text: 'text-ink-mute', sr: '대기' },
  paused: { icon: Pause, color: 'bg-warning-bg text-warning', text: 'font-bold text-warning', sr: '멈춤' },
  failed: { icon: X, color: 'bg-danger-bg text-danger', text: 'font-bold text-danger', sr: '실패' },
}

/**
 * AI 진행 단계 — ✓ 완료 / ◌ 진행 중 / ○ 대기 (+ 멈춤 · 실패), 위에서부터 차례로 나타난다
 *   <AgentSteps steps={[
 *     { label: '쿠팡 열기', status: 'done' },
 *     { label: '상품 담기', status: 'active', detail: '우유 1L × 10' },
 *     { label: '주문서 채우기', status: 'pending' },
 *     { label: '결제 요청', status: 'pending' },
 *   ]} />
 * 멈춤 단계의 이유 · 다음 행동은 detail 로 바로 보여 준다 (화면을 벗어나지 않게)
 */
export function AgentSteps({ steps, stagger = 140, label = 'AI 진행 단계' }) {
  return (
    <ol aria-label={label} className="flex flex-col">
      {steps.map((step, i) => {
        const m = MARK[step.status] ?? MARK.pending
        const Icon = m.icon
        const last = i === steps.length - 1
        return (
          <li
            key={step.label}
            aria-current={step.status === 'active' ? 'step' : undefined}
            className="animate-step-in flex gap-3"
            style={{ animationDelay: `${i * stagger}ms` }}
          >
            <div className="flex flex-col items-center">
              <span className={cx('flex size-7 shrink-0 items-center justify-center rounded-full', m.color)}>
                <Icon size={16} strokeWidth={2.6} className={m.spin ? 'animate-spin' : undefined} aria-hidden="true" />
              </span>
              {!last && (
                <span
                  aria-hidden="true"
                  className={cx('my-1 w-0.5 flex-1', step.status === 'done' ? 'bg-success' : 'bg-line')}
                />
              )}
            </div>
            <div className={cx('flex min-w-0 flex-1 flex-col gap-0.5 pt-1', last ? 'pb-0' : 'pb-4')}>
              <span className={cx('text-body', m.text)}>
                {step.label}
                <span className="sr-only"> ({m.sr})</span>
              </span>
              {step.detail && <span className="text-label text-ink-sub">{step.detail}</span>}
            </div>
          </li>
        )
      })}
    </ol>
  )
}

/** 완료 ✓ — 살짝 튀어 오르는 바운스 (24-10 AI 주문 완료 등) */
export function DoneCheck({ size = 72 }) {
  return (
    <span
      className="animate-check-bounce flex items-center justify-center rounded-full bg-success text-white"
      style={{ width: size, height: size }}
    >
      <Check size={size * 0.5} strokeWidth={3} aria-hidden="true" />
    </span>
  )
}
