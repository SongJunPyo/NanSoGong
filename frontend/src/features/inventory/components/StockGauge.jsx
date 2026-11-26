import { Card, H2, Pill } from '@/components/common/ui'
import { won } from '@/lib/format'

// 입고분 색 — 먼저 들어온 것(먼저 써야 할 것)이 가장 진하다
const LOT_COLORS = ['bg-woori-deep', 'bg-woori-blue', 'bg-sky-400', 'bg-sky-300', 'bg-sky-200']

const shortDate = (key) => (key ? `${Number(key.slice(5, 7))}.${key.slice(8, 10)}` : '')

/**
 * 남은 재고 그래프 — 관리 단위(g · ml · 개)를 기준으로 입고분을 쌓아 보여 주고 적정 재고 선을 긋는다
 *   lots: [{ id, receivedAt, qty(구매 단위) }], packSize: 구매 1개 = 관리 단위 몇
 */
export default function StockGauge({ lots, packSize, unitLabel, packLabel, safeStock }) {
  const size = Number(packSize) || 0
  const sorted = [...lots].sort((a, b) => a.receivedAt.localeCompare(b.receivedAt))
  const parts = sorted.map((lot) => ({ ...lot, amount: lot.qty * size }))
  const total = parts.reduce((sum, p) => sum + p.amount, 0)
  const packs = parts.reduce((sum, p) => sum + p.qty, 0)
  const scale = Math.max(total, safeStock * 1.5, 1) // 적정 재고가 막대 2/3 쯤에 오게
  const hasSafe = safeStock > 0 // 새 품목처럼 적정 재고가 없으면 선과 부족 표시를 뺀다
  const low = hasSafe && total < safeStock
  const pct = (n) => `${Math.min((n / scale) * 100, 100)}%`

  return (
    <Card tone="line">
      <div className="flex items-start gap-2">
        <div className="flex min-w-0 flex-col gap-0.5">
          <H2>남은 재고</H2>
          <p className="num text-[26px] leading-tight font-bold text-ink">
            {won(total)}
            <span className="ml-1 text-body font-bold text-ink-sub">{unitLabel}</span>
          </p>
          {size > 1 && (
            <p className="text-caption text-ink-sub">
              {won(packs)}{packLabel} · 1{packLabel} = {won(size)}
              {unitLabel}
            </p>
          )}
        </div>
        <span className="ml-auto shrink-0">
          {low ? <Pill tone="warn">적정보다 {won(safeStock - total)}{unitLabel} 부족</Pill> : hasSafe && <Pill tone="ok">넉넉해요</Pill>}
        </span>
      </div>

      {/* 막대 + 적정 재고 선 */}
      <div className={`relative ${hasSafe ? 'pt-6' : ''}`}>
        {hasSafe && (
          <span
            className="absolute top-0 -translate-x-1/2 whitespace-nowrap text-[11px] font-bold text-ink-sub"
            style={{ left: pct(safeStock) }}
          >
            적정 {won(safeStock)}
            {unitLabel}
          </span>
        )}
        <div
          role="img"
          aria-label={`남은 재고 ${won(total)}${unitLabel}${hasSafe ? `, 적정 재고 ${won(safeStock)}${unitLabel}` : ''}`}
          className="flex h-5 w-full overflow-hidden rounded-full bg-surface-muted"
        >
          {parts.map((p, i) => (
            <span
              key={p.id}
              className={`h-full border-r-2 border-white last:border-r-0 ${low ? 'bg-danger/80' : LOT_COLORS[i % LOT_COLORS.length]}`}
              style={{ width: pct(p.amount) }}
            />
          ))}
        </div>
        {hasSafe && (
          <span
            aria-hidden="true"
            className="absolute top-5 bottom-[-4px] w-0.5 -translate-x-1/2 rounded bg-ink"
            style={{ left: pct(safeStock) }}
          />
        )}
      </div>

      {/* 입고분별 범례 */}
      {parts.length > 0 ? (
        <ul className="flex flex-wrap gap-x-4 gap-y-1.5">
          {parts.map((p, i) => (
            <li key={p.id} className="flex items-center gap-1.5 text-caption text-ink-sub">
              <span aria-hidden="true" className={`size-2.5 rounded-full ${low ? 'bg-danger/80' : LOT_COLORS[i % LOT_COLORS.length]}`} />
              {shortDate(p.receivedAt)} 입고 · {won(p.amount)}
              {unitLabel}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-caption text-ink-sub">남은 입고분이 없어요.</p>
      )}
    </Card>
  )
}
