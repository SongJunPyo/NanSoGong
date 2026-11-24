import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Screen } from '@/components/common/layout'
import { Button, Card, Divider, Eyebrow, H1, KV, P, Pill } from '@/components/common/ui'
import { won } from '@/lib/format'
import { CHANNELS, ieyo, offerToItem } from '@/features/purchase/channels'
import ExternalOrderSheet from '@/features/purchase/components/ExternalOrderSheet'
import { usePriceCompare } from '@/features/purchase/queries'
import { Badge } from '@/components/ui/badge'
import { Tooltip } from '@/components/ui/tooltip'
import { Spinner } from '@/components/ui/loading'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { EmptyState } from '@/components/ui/empty-state'

const ORDER_ID = 'o1'
const SORTS = {
  total: ['총비용순', (a, b) => a.total - b.total],
  unit: ['개당가순', (a, b) => a.unitPrice - b.unitPrice || a.total - b.total],
  fast: ['빠른 도착', (a, b) => a.arriveDays - b.arriveDays || a.total - b.total],
}

/**
 * 24-1 가격 비교 (UF-12) — 네이버 · 쿠팡 · 등록 거래처를 총비용 · 개당가 · 도착일로 비교
 * 주소에 ?item=none 처럼 없는 품목을 주면 '찾지 못했어요' 화면을 볼 수 있다
 */
export default function PriceComparePage() {
  const [params] = useSearchParams()
  const itemId = params.get('item') ?? 'cup'
  const { data, isFetching } = usePriceCompare(itemId)
  const [sort, setSort] = useState('total')
  const [picked, setPicked] = useState(null) // 시트로 열 상품 (offerToItem 결과)

  if (isFetching && !data)
    return (
      <Screen title="가격 비교">
        <div className="flex justify-center py-16">
          <Spinner showLabel label="쇼핑몰 가격을 비교하고 있어요" />
        </div>
      </Screen>
    )

  if (!data || data.offers.length === 0)
    return (
      <Screen title="가격 비교">
        <EmptyState
          kind="no-results"
          title="쇼핑몰에서 찾지 못했어요"
          description="등록 거래처로 주문할까요?"
          action={<Button to={`/orders/${ORDER_ID}`}>등록 거래처로 주문하기</Button>}
          secondaryAction={
            <Button variant="outline" to="/orders/recommendation">
              발주 추천으로 돌아가기
            </Button>
          }
        />
      </Screen>
    )

  const best = data.offers.find((o) => o.id === data.best)
  const offers = [...data.offers].sort(SORTS[sort][1])
  const coupangShown = offers.some((o) => o.source === 'coupang')

  return (
    <Screen title="가격 비교">
      <Eyebrow>
        {data.product} · 필요 {data.needQty.toLocaleString('ko-KR')}개
      </Eyebrow>
      <H1>{`총비용이 가장 낮은 곳은\n${ieyo(CHANNELS[best.source].source)}`}</H1>

      {/* 정렬은 스크롤해도 헤더 아래에 고정 */}
      <div className="sticky top-[60px] z-10 -mx-screen bg-white px-screen py-2 md:-mx-6 md:px-6 lg:top-20 lg:-mx-8 lg:px-8">
        <SegmentedControl
          label="정렬"
          value={sort}
          onChange={setSort}
          items={Object.entries(SORTS).map(([value, [label]]) => ({ value, label }))}
        />
        {isFetching && <Spinner size={16} showLabel label="최신 가격을 확인하고 있어요" className="mt-2" />}
      </div>

      {offers.map((o) => {
        const ch = CHANNELS[o.source]
        const isBest = o.id === data.best
        return (
          <Card key={o.id} tone="line" className={isBest ? 'ring-2 ring-inset ring-woori-deep' : undefined}>
            <span className="flex gap-1.5">
              {isBest && <Badge status="done">최저가</Badge>}
              <Pill tone={ch.pill}>{ch.source}</Pill>
            </span>
            <p className="text-base font-bold text-ink">
              {o.title}
              {o.seller === ch.source ? '' : ` · ${o.seller}`}
            </p>
            {/* 배송비를 포함한 총비용을 가장 크게 */}
            <div className="flex items-baseline gap-2">
              <span className="text-label text-ink-sub">배송비 포함</span>
              <span className={`num ml-auto text-h1 font-bold ${isBest ? 'text-woori-deep' : 'text-ink'}`}>
                {won(o.total)}원
              </span>
            </div>
            <Divider />
            <KV label="상품가" value={`${won(o.price)}원`} />
            <KV label="배송비" value={o.shippingNote ?? (o.shipping > 0 ? `${won(o.shipping)}원` : '무료')} />
            <KV
              label={
                <span className="inline-flex items-center gap-0.5">
                  개당가
                  <Tooltip label="개당가 설명">
                    총비용(상품가 + 배송비)을 묶음 개수({o.packQty.toLocaleString('ko-KR')}개)로 나눈 값이에요. 묶음 크기가 달라도
                    비교할 수 있어요.
                  </Tooltip>
                </span>
              }
              value={`${won(o.unitPrice)}원`}
            />
            <KV label="도착" value={o.arrive} />
            {o.note && (
              <P small tone="amber">
                {o.note}
              </P>
            )}
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
