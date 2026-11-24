import { useState } from 'react'
import { CircleAlert, Info, TriangleAlert, CircleCheck, X } from 'lucide-react'

const cx = (...a) => a.filter(Boolean).join(' ')

const TONE = {
  info: ['bg-woori-tint text-woori-deep', Info],
  warn: ['bg-warning-bg text-warning', TriangleAlert],
  danger: ['bg-danger-bg text-danger', CircleAlert],
  success: ['bg-success-bg text-success', CircleCheck],
}

// 닫은 배너 기억 — 같은 기간 안에는 다시 띄우지 않는다 (다크 패턴 금지: 닫은 배너 반복 노출)
// 기억하는 값은 배너 key 와 기간뿐이라 localStorage 에 둔다 (토큰 · 개인정보 아님)
const STORAGE_PREFIX = 'nansogong-banner-dismissed:'

/** 'week' 는 ISO 주(월요일 시작) — 예: 2026-W48 */
function periodKey(period, now = new Date()) {
  if (period === 'forever') return 'forever'
  const d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()))
  if (period === 'day') return d.toISOString().slice(0, 10)
  const day = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - day)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const week = Math.ceil(((d - yearStart) / 86400000 + 1) / 7)
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`
}

function readDismissed(key, period) {
  if (!key) return false
  try {
    return localStorage.getItem(STORAGE_PREFIX + key) === periodKey(period)
  } catch {
    return false
  }
}

/**
 * 페이지 상단 안내 띠 — 웹 · 앱 같은 모습
 * @param {'info'|'warn'|'danger'|'success'} tone
 * @param {string} dismissKey  주면 닫은 상태를 기억한다 (없으면 화면을 다시 열 때 다시 보임)
 * @param {'day'|'week'|'forever'} dismissFor  닫은 상태를 기억하는 기간 (기본 week)
 * @param {React.ReactNode} action  오른쪽 동작 (예: <Link>확인하기</Link>)
 */
export function Banner({ tone = 'info', title, children, action, dismissible = true, dismissKey, dismissFor = 'week', onDismiss }) {
  const [hidden, setHidden] = useState(() => readDismissed(dismissKey, dismissFor))
  if (hidden) return null

  const [color, Icon] = TONE[tone]
  const close = () => {
    if (dismissKey) {
      try {
        localStorage.setItem(STORAGE_PREFIX + dismissKey, periodKey(dismissFor))
      } catch {
        /* 저장이 막힌 브라우저면 이번 화면에서만 닫는다 */
      }
    }
    setHidden(true)
    onDismiss?.()
  }

  return (
    <section
      role={tone === 'danger' ? 'alert' : 'status'}
      className={cx('flex items-start gap-2.5 rounded-input px-4 py-3', color)}
    >
      <Icon size={20} className="mt-0.5 shrink-0" aria-hidden="true" />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        {title && <p className="text-label font-bold">{title}</p>}
        {children && <div className="text-label text-ink">{children}</div>}
        {action && <div className="mt-1 text-label font-bold">{action}</div>}
      </div>
      {dismissible && (
        <button
          type="button"
          aria-label="안내 닫기"
          onClick={close}
          className="-m-1 shrink-0 rounded-md p-1.5 opacity-70 hover:opacity-100 focus-visible:outline-2 focus-visible:outline-woori-blue"
        >
          <X size={18} />
        </button>
      )}
    </section>
  )
}
