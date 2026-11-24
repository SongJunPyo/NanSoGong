const cx = (...a) => a.filter(Boolean).join(' ')

/**
 * 상태 색 규칙 — 모든 화면이 이 표 하나를 따른다
 *   pending  대기 · 승인 대기 · 재승인 필요     → 주황 (사장님 차례)
 *   progress 진행 중 · 배송 중 · 주문 중        → 파랑 (AI · 거래처 차례)
 *   done     완료 · 입고 완료 · 최저가          → 초록
 *   stopped  멈춤 · 실패 · 반려                 → 빨강
 *   neutral  보류 · 취소 · 기타                 → 회색
 */
const STATUS = {
  pending: 'bg-warning-bg text-warning',
  progress: 'bg-woori-tint text-woori-blue',
  done: 'bg-success-bg text-success',
  stopped: 'bg-danger-bg text-danger',
  neutral: 'bg-surface-muted text-ink-sub',
}

// 화면에 나오는 상태 문구 → 색 (새 문구가 생기면 여기에 한 줄 추가)
const STATUS_BY_TEXT = {
  대기: 'pending',
  '승인 대기': 'pending',
  '확인 필요': 'pending',
  '재승인 필요': 'pending',
  '쿠팡 주문 필요': 'pending',
  '진행 중': 'progress',
  '배송 중': 'progress',
  '주문 중': 'progress',
  '부분 입고': 'progress',
  완료: 'done',
  '입고 완료': 'done',
  최저가: 'done',
  연결됨: 'done',
  멈춤: 'stopped',
  실패: 'stopped',
  반려: 'stopped',
  보류: 'neutral',
  취소: 'neutral',
}

/** 상태 문구로 색 이름 찾기 — 모르는 문구는 neutral */
export const statusOf = (text) => STATUS_BY_TEXT[text] ?? 'neutral'

/**
 * 상태 뱃지
 *   <Badge>배송 중</Badge>              ← 문구로 색 자동
 *   <Badge status="done">최저가</Badge>
 */
export function Badge({ status, children, className }) {
  const s = status ?? (typeof children === 'string' ? statusOf(children) : 'neutral')
  return <span className={cx('pill shrink-0 whitespace-nowrap', STATUS[s], className)}>{children}</span>
}

/**
 * 개수 뱃지 (사이드바 대기 건수 · 탭 개수) — 0 이면 그리지 않는다 (showZero 로 표시 가능)
 * @param {'alert'|'muted'|'active'} tone  alert = 빨강(사장님 차례), muted = 회색, active = 진한 파랑
 */
export function CountBadge({ count, max = 99, tone = 'alert', showZero = false, label, className }) {
  if (!count && !showZero) return null
  const color = tone === 'alert' ? 'bg-danger text-white' : tone === 'active' ? 'bg-woori-deep text-white' : 'bg-line text-ink-sub'
  return (
    <span
      aria-label={label ? `${label} ${count}건` : undefined}
      className={cx(
        'num inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full px-1.5 text-[11px] font-bold',
        color,
        className,
      )}
    >
      {count > max ? `${max}+` : count}
    </span>
  )
}
