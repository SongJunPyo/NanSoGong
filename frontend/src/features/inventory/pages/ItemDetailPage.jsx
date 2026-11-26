import { Link, useParams } from 'react-router-dom'
import { CloudRain, Pencil } from 'lucide-react'
import { Screen } from '@/components/common/layout'
import { Button, ButtonRow, Card, Eyebrow, H2, KV } from '@/components/common/ui'
import StockBar from '@/features/inventory/components/StockBar'
import { useInventory } from '@/features/inventory/queries'
import { ITEM_UNITS } from '@/features/inventory/mock'
import { STATES, emptyText, qtyText, reasonText, stockInfo } from '@/features/inventory/stock'
import { won } from '@/lib/format'

const shortDate = (iso) => iso?.slice(5).replace('-', '.')

/** 22 품목 상세 (UF-10 3 · UF-09 6) — 목록에서 뺀 숫자 · 입고분 · 실사 · 폐기 · 수정을 여기서 */
export default function ItemDetailPage() {
  const { id } = useParams()
  const { data: items } = useInventory()
  const item = items.find((i) => i.id === id)

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
          {item.packSize > 1 && (
            <span className="num text-label text-ink-sub">
              {won(info.left * item.packSize)}
              {unit}
            </span>
          )}
        </div>
        {(reasonText(info) || item.incoming) && (
          <p className={`text-label ${info.state === 'incoming' ? 'font-bold text-woori-deep' : 'text-ink-sub'}`}>
            {item.incoming ? `${item.incoming.arriveDays === 1 ? '내일' : `${item.incoming.arriveDays}일 뒤`} ${qtyText(item.incoming.qty)} 도착 예정` : reasonText(info)}
          </p>
        )}
        <StockBar item={item} info={info} />
      </Card>

      <Card tone="line">
        <H2>운영 기준</H2>
        {info.safe != null && <KV label="적정 재고" value={qtyText(info.safe)} />}
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
          <H2>입고분별 남은 양 · 소비기한 빠른 순</H2>
          {[...item.lots].filter((lot) => lot.qty > 0).sort((a, b) => (a.expiresAt ?? '9').localeCompare(b.expiresAt ?? '9')).map((lot) => (
            <KV
              key={lot.id}
              label={`${shortDate(lot.receivedAt)} 입고${lot.expiresAt ? ` · ~${shortDate(lot.expiresAt)}` : ''}`}
              value={qtyText(lot.qty)}
            />
          ))}
        </Card>
      )}

      <ButtonRow>
        <Button variant="outline" to="/inventory/adjust">
          실사·폐기
        </Button>
        <Button to="/orders/recommendation">발주 추천</Button>
      </ButtonRow>
    </Screen>
  )
}
