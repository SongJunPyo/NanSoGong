import { LoaderCircle } from 'lucide-react'

// text-h2 같은 커스텀 크기 토큰을 tailwind-merge 가 지우는 문제 때문에 단순히 이어 붙인다 (common/ui.jsx 와 같음)
const cx = (...a) => a.filter(Boolean).join(' ')

/** 자리 표시 막대 — 데이터 모양대로 놓아 두면 화면이 덜 흔들린다 */
export function Skeleton({ className = 'h-4 w-full', rounded = 'rounded-md' }) {
  return <div aria-hidden="true" className={cx('animate-pulse bg-surface-muted', rounded, className)} />
}

/** 카드 한 장 크기의 Skeleton 묶음 */
export function SkeletonCard({ lines = 3 }) {
  return (
    <div role="status" aria-label="불러오는 중이에요" className="flex flex-col gap-2.5 rounded-card border border-line p-[18px]">
      <Skeleton className="h-5 w-2/5" />
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} className={i === lines - 1 ? 'h-4 w-3/5' : 'h-4 w-full'} />
      ))}
    </div>
  )
}

/** 빙글 도는 표시 — label 은 화면 읽기 프로그램에 읽히고, showLabel 이면 화면에도 보인다 */
export function Spinner({ size = 20, label = '불러오는 중이에요', showLabel = false, className }) {
  return (
    <span role="status" className={cx('inline-flex items-center gap-2 text-ink-sub', className)}>
      <LoaderCircle size={size} className="animate-spin text-woori-blue" aria-hidden="true" />
      {showLabel ? <span className="text-label">{label}</span> : <span className="sr-only">{label}</span>}
    </span>
  )
}

const BTN = {
  primary: 'bg-woori-deep text-white',
  secondary: 'bg-woori-tint text-woori-deep',
  outline: 'bg-white border border-line text-ink',
  danger: 'bg-danger text-white',
}

/**
 * 처리 중 표시가 되는 버튼 — common/ui 의 Button 과 같은 모양
 * loading 동안 눌리지 않고, 글자 자리에 Spinner + loadingText 를 보여 준다 (버튼 크기는 그대로)
 */
export function ButtonLoading({
  loading = false,
  loadingText = '처리하고 있어요',
  variant = 'primary',
  full = true,
  disabled,
  className,
  children,
  type = 'button',
  ...props
}) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cx(
        'inline-flex h-[52px] items-center justify-center gap-2 rounded-button px-4 text-base font-bold transition active:scale-[.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-woori-blue disabled:cursor-not-allowed',
        BTN[variant],
        full && 'w-full',
        disabled && !loading && 'opacity-50',
        className,
      )}
      {...props}
    >
      {loading ? (
        <>
          <LoaderCircle size={18} className="animate-spin" aria-hidden="true" />
          {loadingText}
        </>
      ) : (
        children
      )}
    </button>
  )
}
