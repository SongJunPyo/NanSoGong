import { CircleCheck, CloudOff, FilterX, Lock, SearchX, Sparkles, TriangleAlert } from 'lucide-react'
import { won } from '@/lib/format'

const cx = (...a) => a.filter(Boolean).join(' ')

// 종류별 기본 아이콘 · 색 · 문구 — 화면에서 title · description 으로 바꿔 쓸 수 있다
const KIND = {
  first: { icon: Sparkles, color: 'bg-woori-tint text-woori-blue', title: '아직 등록한 내용이 없어요' },
  'no-results': { icon: SearchX, color: 'bg-surface-muted text-ink-sub', title: '검색 결과가 없어요' },
  'no-filter': { icon: FilterX, color: 'bg-surface-muted text-ink-sub', title: '조건에 맞는 항목이 없어요' },
  offline: { icon: CloudOff, color: 'bg-surface-muted text-ink-sub', title: '인터넷 연결이 끊겼어요', description: '연결되면 다시 불러올게요.' },
  done: { icon: CircleCheck, color: 'bg-success-bg text-success', title: '모두 끝냈어요' },
  error: { icon: TriangleAlert, color: 'bg-danger-bg text-danger', title: '불러오지 못했어요', description: '잠시 뒤 다시 시도해 주세요.' },
  locked: { icon: Lock, color: 'bg-warning-bg text-warning', title: '조건을 채우면 열려요' },
}

/**
 * 비어 있는 화면 · 막힌 화면
 * @param {'first'|'no-results'|'no-filter'|'offline'|'done'|'error'|'locked'} kind
 * @param {React.ReactNode} action  주요 동작 (예: <Button>다시 시도</Button>)
 * @param {React.ReactNode} secondaryAction  보조 동작
 * @param {{ value:number, max:number, unit?:string, label?:string }} progress  잠김 상태 진행 막대
 *   예) 최소 주문 금액: { value: 15550, max: 19800, unit: '원', label: '최소 주문 금액까지' }
 * @param {boolean} compact  카드 안처럼 좁은 곳
 */
export function EmptyState({ kind = 'first', title, description, action, secondaryAction, progress, compact = false, icon }) {
  const preset = KIND[kind]
  const Icon = icon ?? preset.icon
  const pct = progress ? Math.min(100, Math.round((progress.value / progress.max) * 100)) : 0

  return (
    <section
      role={kind === 'error' || kind === 'offline' ? 'alert' : undefined}
      className={cx('flex flex-col items-center text-center', compact ? 'gap-2 py-6' : 'gap-3 px-4 py-12')}
    >
      <span className={cx('flex items-center justify-center rounded-full', preset.color, compact ? 'size-12' : 'size-16')}>
        <Icon size={compact ? 24 : 30} aria-hidden="true" />
      </span>
      <h3 className="text-h2 font-bold text-ink">{title ?? preset.title}</h3>
      {(description ?? preset.description) && (
        <p className="max-w-[320px] whitespace-pre-line text-label text-ink-sub">{description ?? preset.description}</p>
      )}
      {progress && (
        <div className="flex w-full max-w-[300px] flex-col gap-1.5">
          <div
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={progress.max}
            aria-valuenow={progress.value}
            aria-label={progress.label}
            className="h-2.5 w-full overflow-hidden rounded-full bg-surface-muted"
          >
            <div className="h-full rounded-full bg-warning transition-[width]" style={{ width: `${pct}%` }} />
          </div>
          <p className="num text-label">
            <span className="font-bold text-ink">{won(progress.value)}</span>
            <span className="text-ink-sub">
              {' '}
              / {won(progress.max)}
              {progress.unit}
            </span>
          </p>
        </div>
      )}
      {(action || secondaryAction) && (
        <div className="mt-2 flex w-full max-w-[320px] flex-col gap-2">
          {action}
          {secondaryAction}
        </div>
      )}
    </section>
  )
}
