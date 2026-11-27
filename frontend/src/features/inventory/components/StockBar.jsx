import { STATES, qtyText, stockInfo } from '@/features/inventory/stock'

/**
 * ④ 기준 대비 위치 — 0 부터 적정 재고까지의 막대 (적정이 오른쪽 끝 = "꽉 차면 충분")
 *   남은 양이 줄면 막대가 짧아진다. 기준선에 "적정 N개"를 글자로 써서 외울 필요가 없게 한다
 *   막대 색은 상태 색 (부족 빨강 · 임박 주황 · 입고 예정 파랑 · 여유 회색)
 */
export default function StockBar({ item, info = stockInfo(item), className = '' }) {
  if (!info.safe) return null
  const pct = Math.min((info.left / info.safe) * 100, 100)

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <div
        role="img"
        aria-label={`적정 ${qtyText(info.safe)} 중 ${qtyText(info.left)} 남음`}
        className="relative h-2.5 rounded-full bg-[#E5E7EB]"
      >
        <span className={`absolute inset-y-0 left-0 rounded-full ${STATES[info.state].bar}`} style={{ width: `${pct}%` }} />
        <span aria-hidden="true" className="absolute -inset-y-1 right-0 w-0.5 rounded bg-[#374151]" />
      </div>
      <div aria-hidden="true" className="num flex justify-between text-[12px] text-[#4B5563]">
        <span>0</span>
        <span className="font-medium">적정 {qtyText(info.safe)}</span>
      </div>
    </div>
  )
}
