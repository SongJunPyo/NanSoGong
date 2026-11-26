import { useEffect } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { CloudRain, Pencil } from 'lucide-react'
import { Screen } from '@/components/common/layout'
import { Button, ButtonRow, Card, Eyebrow, H2, KV } from '@/components/common/ui'
import StockBar from '@/features/inventory/components/StockBar'
import { useInventory } from '@/features/inventory/queries'
import { ITEM_UNITS } from '@/features/inventory/mock'
import { STATES, emptyText, incomingText, qtyText, reasonText, stockInfo } from '@/features/inventory/stock'
import { won } from '@/lib/format'

const shortDate = (iso) => iso?.slice(5).replace('-', '.')
const SUB = 'text-[#4B5563]'

/** 22 품목 상세 (UF-10 3 · UF-09 6) — 목록에서 뺀 숫자 · 입고분 · 실사 · 폐기 · 수정을 여기서 */
export default function ItemDetailPage() {
  const { id } = useParams()
  const { data: items } = useInventory()
  const item = items.find((i) => i.id === id)
  const { hash } = useLocation()
  // 재고 카드의 [먼저 쓸 입고분 보기] → 입고분 목록으로 바로 내려간다
  useEffect(() => {
    if (hash === '#lots') document.getElementById('lots')?.scrollIntoView({ block: 'start' })
  }, [hash])

  if (!item) {
    return (
      <Screen title="품목">
        <p role="status" className="py-10 text-center text-label text-ink-sub">품목을 찾을 수 없어요.</p>
      </Screen>
    )
  }

  const info = stockInfo(item)
  const unit = ITEM_UNITS.find((u) => u.value === item.unit)?.label ?? ''
  const low = info.state === 'low'
  const todayKey = '2026-11-26' // 목업 기준일 (stock.js 의 TODAY 와 같은 날)
  const lots = [...(item.lots ?? [])].filter((lot) => lot.qty > 0).sort((a, b) => (a.expiresAt ?? '9').localeCompare(b.expiresAt ?? '9'))

  return (
    <Screen
      title={item.name}
      headerActions={
        <Link
          to={`/inventory/items/${item.id}/edit`}
          aria-label="품목 수정"
          className="inline-flex size-10 items-center justify-center rounded-lg text-ink hover:bg-white/80"
        >
          <Pencil size={20} />
        </Link>
      }
    >
      <Card>
        <div className="flex items-center gap-2">
          <Eyebrow>지금 남은 양</Eyebrow>
          <span className={`ml-auto rounded-md px-2 py-1 text-[13px] leading-none font-bold ${STATES[info.state].badge}`}>
            <span aria-hidden="true">{STATES[info.state].mark}</span> {STATES[info.state].label}
          </span>
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="num text-[30px] font-bold text-ink">{qtyText(info.left)}</span>
        </div>
        {(reasonText(info) || item.incoming) && (
          <p className={`text-label ${info.state === 'incoming' ? 'font-bold text-woori-deep' : 'text-ink-sub'}`}>
            {item.incoming ? incomingText(item.incoming) : reasonText(info)}
          </p>
        )}
        <StockBar item={item} info={info} />
      </Card>

      <Card tone="line">
        <H2>운영 기준</H2>
        {info.safe != null && <KV label="적정 재고" value={qtyText(info.safe)} />}
        {item.packSize > 1 && <KV label="1개에 든 양" value={`${won(item.packSize)}${unit}`} />}
        {info.perDay != null && <KV label="하루 평균 사용" value={qtyText(Math.round(info.perDay * 10) / 10)} />}
        {info.daysLeft != null && <KV label="다 떨어지는 때" value={emptyText(info.daysLeft)} tone={low ? 'warn' : 'ink'} />}
        <KV label="최근 실사" value="11.15" />
        {item.id === 'milk' && (
          <p className="flex items-center gap-1.5 text-[13px] font-medium text-woori-blue">
            <CloudRain size={18} className="text-weather-rain" /> 비 오는 날은 기준을 18% 높여 계산해요
          </p>
        )}
      </Card>

      {item.lots?.length > 0 && (
        <Card tone="line">
          <h2 id="lots" className="scroll-mt-24 text-h2 font-bold text-ink">
            입고분별 남은 양 · 소비기한 빠른 순
          </h2>
          {lots.map((lot) => {
            const expired = lot.expiresAt && lot.expiresAt < todayKey
            const first = lot.id === info.expiringLot?.id
            return (
              <div key={lot.id} className={`flex items-center gap-2 rounded-lg ${first || expired ? '-mx-2 px-2 py-1.5' : ''} ${expired ? 'bg-danger-bg' : first ? 'bg-warning-bg' : ''}`}>
                <span className={`text-label ${SUB}`}>
                  {shortDate(lot.receivedAt)} 입고{lot.expiresAt ? ` · ~${shortDate(lot.expiresAt)}` : ''}
                </span>
                {expired && <span className="rounded-md bg-white px-1.5 py-0.5 text-[12px] font-bold text-danger">기한 지남</span>}
                {first && !expired && <span className="rounded-md bg-white px-1.5 py-0.5 text-[12px] font-bold text-amber-800">먼저 쓰기</span>}
                <span className="num ml-auto text-label font-bold text-ink">{qtyText(lot.qty)}</span>
              </div>
            )
          })}
        </Card>
      )}

      {/* 상태에 맞는 행동만 — 임박 · 입고 예정 · 여유 품목에는 발주를 권하지 않는다 */}
      <ButtonRow>
        <Button variant="outline" to={`/inventory/adjust?item=${item.id}`}>
          실사 등록
        </Button>
        {low ? (
          <Button to="/orders/recommendation">{item.draft ? `AI 발주안 · ${qtyText(item.draft.qty)}` : '발주 추천'}</Button>
        ) : (
          <Button variant={info.state === 'expiring' ? 'primary' : 'outline'} to={`/inventory/adjust/discard?item=${item.id}`}>
            폐기 등록
          </Button>
        )}
      </ButtonRow>
    </Screen>
  )
}
