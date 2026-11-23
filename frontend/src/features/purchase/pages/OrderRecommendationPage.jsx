import { Screen } from '@/components/common/layout'
import { Button, ButtonRow, Card, Divider, Eyebrow, H1, H2, HeadRow, KV, P, Pill } from '@/components/common/ui'
import { won } from '@/lib/format'
import { channelOf } from '@/features/purchase/channels'
import PriceCompareCard from '@/features/purchase/components/PriceCompareCard'
import { useOrderRecommendation } from '@/features/purchase/queries'

/** 24 발주 추천 (UF-12) — 품목마다 "앱에서 전송" 인지 "쿠팡에서 직접 주문" 인지 보여준다 */
export default function OrderRecommendationPage() {
  const { data: r } = useOrderRecommendation()
  const linkItems = r.items.filter((it) => channelOf(it).kind === 'link')
  return (
    <Screen title="발주 추천">
      <Eyebrow>AI 추천 · 승인 대기</Eyebrow>
      <H1>{`${r.items.length}개 품목을\n발주할까요?`}</H1>
      <Card tone="line">
        {r.items.map((it, i) => {
          const ch = channelOf(it)
          return (
            <div key={it.id} className="flex flex-col gap-2.5">
              {i > 0 && <Divider />}
              <div className="flex items-center gap-2">
                <div className="flex flex-col gap-1">
                  <span className="text-body font-bold text-ink">
                    {it.product} × {it.qty.toLocaleString('ko-KR')}
                  </span>
                  <span className="text-[13px] text-ink-sub">
                    {it.supplier} · {it.arrive} 도착
                  </span>
                  <span>
                    {ch.kind === 'api' ? (
                      <Pill tone="ok">앱에서 바로 전송</Pill>
                    ) : (
                      <Pill tone="amber">{ch.label}에서 직접 주문</Pill>
                    )}
                  </span>
                </div>
                <span className="num ml-auto self-start text-body font-bold text-ink">{won(it.price)}원</span>
              </div>
            </div>
          )
        })}
      </Card>
      {linkItems.map((it) => (
        <PriceCompareCard key={it.id} itemId={it.id} />
      ))}
      <Card>
        <KV label="품목 금액" value={r.subtotal} />
        <KV label="배송비" value={r.shipping} />
        <KV label="총액" value={r.total} tone="deep" />
      </Card>
      {linkItems.length > 0 && (
        <Card tone="amber">
          <HeadRow title={`${linkItems.length}개 품목은 AI가 대신 주문해요`} size="text-base">
            <Pill tone="amberWhite">결제만 직접</Pill>
          </HeadRow>
          <P tone="ink">
            {linkItems.map((it) => `${it.product}(${channelOf(it).source ?? channelOf(it).label})`).join(', ')}
            {'은 앱 연동(API)이 안 되는 곳이에요. 승인하면 AI가 사장님 계정으로 주문서까지 채우고, 결제만 사장님이 해요.'}
          </P>
          <Button variant="outline" to="/orders/agent">
            AI가 {channelOf(linkItems[0]).source ?? channelOf(linkItems[0]).label}에서 대신 주문
          </Button>
        </Card>
      )}
      <Card>
        <H2>산출 근거</H2>
        <P tone="ink">
          예상 소모량 · 입고 예정량 · 배송 기간 · 운영 기준을 반영했어요. 금·월 비 예보로 우유 사용량을 18% 높게 잡았고,
          컵은 등록 거래처보다 쿠팡 최저가가 총비용이 낮아 쿠팡을 추천했어요.
        </P>
      </Card>
      <Button variant="outline" to="/orders/recommendation/edit">
        조건 수정
      </Button>
      <Button to="/orders/o1">제안대로 할게요 (승인)</Button>
      <ButtonRow>
        <Button variant="secondary" to="/on-hold">
          보류
        </Button>
        <Button variant="secondary" to="/reject">
          반려
        </Button>
      </ButtonRow>
    </Screen>
  )
}
