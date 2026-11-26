import { won } from '@/lib/format'
import { ITEM_UNITS } from '@/features/inventory/mock'

/** 남은 재고(관리 단위) = 입고분 남은 구매 단위 수 × 포장 규격 */
function stockOf(item) {
  return (item.lots ?? []).reduce((sum, lot) => sum + lot.qty * (item.packSize || 1), 0)
}

/**
 * 재고 목록의 남은 양 막대 — 관리 단위(g · ml · 개) 기준, 적정 재고 위치에 세로선
 *   적정보다 적으면 빨강, 아니면 파랑. 상세 데이터(lots · safeStock)가 없는 품목은 그리지 않는다
 */
export default function StockBar({ item, bare = false, className = '' }) {
  if (!item.lots || !item.safeStock) return null
  const unit = ITEM_UNITS.find((u) => u.value === item.unit)?.label ?? ''
  const stock = stockOf(item)
  const safe = item.safeStock
  const scale = Math.max(stock, safe * 1.5) // 적정 재고가 막대 2/3 쯤에 오게
  const low = stock < safe
  const pct = (n) => `${Math.min((n / scale) * 100, 100)}%`

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <div
        role="img"
        aria-label={`남은 양 ${won(stock)}${unit}, 적정 ${won(safe)}${unit}${low ? ', 부족' : ''}`}
        className="relative h-2 min-w-0 flex-1 rounded-full bg-surface-muted"
      >
        <span className={`absolute inset-y-0 left-0 rounded-full ${low ? 'bg-danger' : 'bg-woori-blue'}`} style={{ width: pct(stock) }} />
        <span aria-hidden="true" className="absolute -inset-y-1 w-0.5 -translate-x-1/2 rounded bg-ink/60" style={{ left: pct(safe) }} />
      </div>
      {/* bare: 목록 카드처럼 숫자 없이 막대만 */}
      <span className={`num shrink-0 text-caption text-ink-sub ${bare ? 'hidden' : ''}`}>
        <span className={`font-bold ${low ? 'text-danger' : 'text-ink'}`}>{won(stock)}</span> / {won(safe)}
        {unit}
      </span>
    </div>
  )
}
