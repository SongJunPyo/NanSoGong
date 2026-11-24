import { Fragment } from 'react'
import { Button, Card, Divider, HeadRow, P, Pill } from '@/components/common/ui'
import { won } from '@/lib/format'
import { CHANNELS } from '@/features/purchase/channels'
import { usePriceCompare } from '@/features/purchase/queries'
import { Badge } from '@/components/ui/badge'

/**
 * 24 발주 추천 안의 '가격 비교 3곳' 카드 (UF-12)
 * 서버가 네이버 쇼핑 검색 API · 쿠팡 파트너스 API · 등록 거래처 단가를 모아 총비용순으로 준다
 */
export default function PriceCompareCard({ itemId }) {
  const { data } = usePriceCompare(itemId)
  if (!data) return null
  const offers = [...data.offers].sort((a, b) => a.total - b.total).slice(0, 3)
  return (
    <Card tone="line" className="ring-2 ring-inset ring-woori-deep">
      <HeadRow title={`가격 비교 ${offers.length}곳`} size="text-base">
        <span className="whitespace-nowrap text-caption text-ink-sub">{data.checkedAt} 기준</span>
      </HeadRow>
      {offers.map((o, i) => {
        const ch = CHANNELS[o.source]
        const best = o.id === data.best
        return (
          <Fragment key={o.id}>
            {i > 0 && <Divider />}
            <div className="flex items-center gap-2">
              <div className="flex flex-col gap-1">
                <span className="flex gap-1.5">
                  {best && <Badge status="done">최저가</Badge>}
                  <Pill tone={ch.pill}>{ch.source}</Pill>
                </span>
                <span className="text-[13px] text-ink-sub">
                  {o.seller === ch.source ? '' : `${o.seller} · `}
                  {o.packQty.toLocaleString('ko-KR')}개 · {o.arrive}
                </span>
              </div>
              <div className="ml-auto flex flex-col items-end gap-0.5 self-start">
                <span className={`num text-body font-bold ${best ? 'text-woori-deep' : 'text-ink'}`}>
                  {won(o.total)}원
                </span>
                <span className="text-caption text-ink-sub">
                  개당 {won(o.unitPrice)}원{o.shipping > 0 ? ' · 배송비 포함' : ''}
                </span>
              </div>
            </div>
          </Fragment>
        )
      })}
      <P small>가격은 바뀔 수 있어요. 주문 전에 쇼핑몰에서 최종 가격을 확인하세요.</P>
      <Button variant="text" to={`/orders/recommendation/compare?item=${itemId}`}>
        전체 비교 보기 →
      </Button>
    </Card>
  )
}
