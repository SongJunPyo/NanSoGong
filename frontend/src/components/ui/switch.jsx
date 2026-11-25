import { useId, useState } from 'react'

const cx = (...a) => a.filter(Boolean).join(' ')

/**
 * 켜기 · 끄기 스위치 — 웹 · 앱 같은 모습
 *   🚨 다크 패턴 금지: 자동 결제 · 자동 승인 · 선택 동의는 기본값 '끔' (defaultChecked = false)
 *
 *   제어:   <Switch label="자동 승인" checked={on} onCheckedChange={setOn} />
 *   비제어: <Switch label="알림 받기" defaultChecked />
 */
export function Switch({ label, description, checked, defaultChecked = false, onCheckedChange, disabled }) {
  const [inner, setInner] = useState(defaultChecked)
  const on = checked ?? inner
  const descId = useId()

  const toggle = () => {
    const next = !on
    if (checked === undefined) setInner(next)
    onCheckedChange?.(next)
  }

  return (
    <div className="flex items-center gap-3 py-2.5">
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-body font-medium text-ink">{label}</span>
        {description && (
          <span id={descId} className="text-[13px] text-ink-sub">
            {description}
          </span>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={label}
        aria-describedby={description ? descId : undefined}
        onClick={toggle}
        disabled={disabled}
        className={cx(
          'relative h-7 w-12 shrink-0 rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-woori-blue disabled:opacity-50',
          on ? 'bg-woori-deep' : 'bg-line',
        )}
      >
        <span
          aria-hidden="true"
          className={cx('absolute top-[3px] size-[22px] rounded-full bg-white shadow-sm transition-all', on ? 'left-[23px]' : 'left-[3px]')}
        />
        <span className="sr-only">{on ? '켜짐' : '꺼짐'}</span>
      </button>
    </div>
  )
}
