import { Minus, Plus } from 'lucide-react'
import { useIsDesktop } from '@/hooks/useViewport'

const cx = (...a) => a.filter(Boolean).join(' ')

/**
 * 수량 입력
 *   웹: 숫자를 바로 치는 입력 칸 (+ 단위)
 *   앱: [−] 숫자 [+] 스테퍼 — 한 손 엄지로 누르기 쉽게 버튼 44px 이상. 가운데 숫자도 직접 칠 수 있다
 *
 * 검사는 화면이 한다 — 0 이하 같은 값도 그대로 onChange 로 넘기고, 화면이 InlineError 를 띄운다
 *   const err = qty < 1 ? '1개 이상 입력해 주세요' : ''
 *   <QuantityInput id="qty" value={qty} onChange={setQty} invalid={!!err} errorId="qty-error" />
 *   <InlineError id="qty-error">{err}</InlineError>
 *
 * @param {number|''} value  빈 칸은 '' (지우는 중)
 * @param {number} min · max  스테퍼 버튼이 넘지 않는 범위 (직접 입력은 막지 않는다)
 */
export function QuantityInput({ id, value, onChange, min = 0, max, step = 1, unit, label, invalid = false, errorId, disabled }) {
  const desktop = useIsDesktop()
  const num = value === '' ? 0 : Number(value)

  const fromInput = (e) => {
    const raw = e.target.value.replace(/[^\d-]/g, '')
    onChange(raw === '' || raw === '-' ? '' : Number(raw))
  }
  const bump = (d) => {
    let next = num + d
    if (next < min) next = min
    if (max != null && next > max) next = max
    onChange(next)
  }

  const inputProps = {
    id,
    type: 'text',
    inputMode: 'numeric',
    value,
    onChange: fromInput,
    disabled,
    'aria-label': label,
    'aria-invalid': invalid || undefined,
    'aria-describedby': invalid ? errorId : undefined,
  }
  const ring = invalid ? 'ring-[1.5px] ring-danger' : 'focus-within:ring-2 focus-within:ring-woori-blue'

  if (desktop) {
    return (
      <div className={cx('flex h-11 w-40 items-center rounded-input bg-surface-muted px-3', ring)}>
        <input {...inputProps} className="num w-full min-w-0 bg-transparent text-right text-body font-bold text-ink outline-none" />
        {unit && <span className="ml-1.5 shrink-0 text-label text-ink-sub">{unit}</span>}
      </div>
    )
  }

  const stepBtn =
    'flex size-11 shrink-0 items-center justify-center rounded-input bg-white text-ink active:bg-woori-tint disabled:text-ink-mute'
  return (
    <div className={cx('inline-flex items-center gap-1 rounded-input bg-surface-muted p-1', ring)}>
      <button type="button" aria-label="하나 줄이기" onClick={() => bump(-step)} disabled={disabled || num <= min} className={stepBtn}>
        <Minus size={18} />
      </button>
      <div className="flex w-16 items-baseline justify-center gap-0.5">
        <input {...inputProps} className="num w-full min-w-0 bg-transparent text-center text-body font-bold text-ink outline-none" />
        {unit && <span className="shrink-0 text-caption text-ink-sub">{unit}</span>}
      </div>
      <button
        type="button"
        aria-label="하나 늘리기"
        onClick={() => bump(step)}
        disabled={disabled || (max != null && num >= max)}
        className={stepBtn}
      >
        <Plus size={18} />
      </button>
    </div>
  )
}
