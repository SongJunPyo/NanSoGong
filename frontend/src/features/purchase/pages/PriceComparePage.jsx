import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Screen } from '@/components/common/layout'
import { Button, Card, Chips, Eyebrow, H1, KV, P, Pill } from '@/components/common/ui'
import { won } from '@/lib/format'
import { CHANNELS, ieyo, offerToItem } from '@/features/purchase/channels'
import ExternalOrderSheet from '@/features/purchase/components/ExternalOrderSheet'
import { usePriceCompare } from '@/features/purchase/queries'

const ORDER_ID = 'o1'
const SORTS = [
  ['총비용순', (a, b) => a.total - b.total],
  ['개당가순', (a, b) => a.unitPrice - b.unitPrice || a.total - b.total],
  ['빠른 도착', (a, b) => a.arriveDays - b.arriveDays || a.total - b.total],
]

/** 24-1 가격 비교 (UF-12) — 네이버 · 쿠팡 · 등록 거래처를 총비용 · 개당가 · 도착일로 비교 */
export default function PriceComparePage() {
  const [params] = useSearchParams()
  const itemId = params.get('item') ?? 'cup'
  const { data } = usePriceCompare(itemId)
  const [sort, setSort] = useState(0)
  const [picked, setPicked] = useState(null) // 시트로 열 상품 (offerToItem 결과)

  if (!data)
    return (
      <Screen title="가격 비교" back>
        <P>비교할 가격 정보가 없어요.</P>
      </Screen>
    )

  const best = data.offers.find((o) => o.id === data.best)
  const offers = [...data.offers].sort(SORTS[sort][1])
  const coupangShown = offers.some((o) => o.source === 'coupang')

  return (
    <Screen title="가격 비교" back>
      <Eyebrow>
        {data.product} · 필요 {data.needQty.toLocaleString('ko-KR')}개
      </Eyebrow>
      <H1>{`총비용이 가장 낮은 곳은\n${ieyo(CHANNELS[best.source].source)}`}</H1>
      <Chips items={SORTS.map(([label]) => label)} equal onChange={setSort} />
      {offers.map((o) => {
        const ch = CHANNELS[o.source]
        const isBest = o.id === data.best
        return (
          <Card key={o.id} tone="line" className={isBest ? 'ring-2 ring-inset ring-woori-deep' : undefined}>
            <span className="flex gap-1.5">
              {isBest && <Pill tone="deep">추천</Pill>}
              <Pill tone={ch.pill}>{ch.source}</Pill>
            </span>
            <p className="text-base font-bold text-ink">
              {o.title}
              {o.seller === ch.source ? '' : ` · ${o.seller}`}
            </p>
            <KV label="상품가" value={`${won(o.price)}원`} />
            <KV label="배송비" value={o.shippingNote ?? (o.shipping > 0 ? `${won(o.shipping)}원` : '무료')} />
            <KV label="개당가" value={`${won(o.unitPrice)}원`} />
            <KV label="도착" value={o.arrive} />
            <KV label="총비용" value={`${won(o.total)}원`} tone="deep" />
            {o.note && <P small tone="amber">{o.note}</P>}
            {ch.kind === 'api' ? (
              <Button variant="secondary" to={`/orders/${ORDER_ID}`}>
                앱에서 바로 전송
              </Button>
            ) : (
              <Button variant={isBest ? 'primary' : 'outline'} onClick={() => setPicked(offerToItem(itemId, o))}>
                {ch.source}에서 주문하기
              </Button>
            )}
          </Card>
        )
      })}
      <P small>
        {data.checkedAt} 조회 · 네이버 쇼핑 검색 API, 쿠팡 파트너스 API 기준. 가격은 바뀔 수 있어요.
        {coupangShown ? ` ${CHANNELS.coupang.disclosure}` : ''}
      </P>
      {picked && <ExternalOrderSheet open onClose={() => setPicked(null)} orderId={ORDER_ID} item={picked} />}
    </Screen>
  )
}
