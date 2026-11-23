import { Screen } from '@/components/common/layout'
import { Button, ButtonRow, Card, Divider, Eyebrow, H1, H2, KV, P } from '@/components/common/ui'
import { useOrderRecommendation } from '@/features/purchase/queries'

/** 24 발주 추천 (UF-12) */
export default function OrderRecommendationPage() {
  const { data: r } = useOrderRecommendation()
  return (
    <Screen title="발주 추천">
      <Eyebrow>AI 추천 · 승인 대기</Eyebrow>
      <H1>{`${r.items.length}개 품목을\n발주할까요?`}</H1>
      <Card tone="line">
        {r.items.map((it, i) => (
          <div key={it.name} className="flex flex-col gap-2.5">
            {i > 0 && <Divider />}
            <div className="flex items-center gap-2">
              <div className="flex flex-col gap-0.5">
                <span className="text-body font-bold text-ink">{it.name}</span>
                <span className="text-[13px] text-ink-sub">{it.sub}</span>
              </div>
              <span className="num ml-auto text-body font-bold text-ink">{it.price}</span>
            </div>
          </div>
        ))}
      </Card>
      <Card>
        <KV label="품목 금액" value={r.subtotal} />
        <KV label="배송비" value={r.shipping} />
        <KV label="총액" value={r.total} tone="deep" />
      </Card>
      <Card>
        <H2>산출 근거</H2>
        <P tone="ink">
          예상 소모량 · 입고 예정량 · 배송 기간 · 운영 기준을 반영했어요. 금·월 비 예보로 우유 사용량을 18% 높게 잡았고,
          원두는 기존 거래처 품절로 신규 판매처 3곳을 비교했어요.
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
