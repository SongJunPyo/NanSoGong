import { Screen } from '@/components/common/layout'
import { Button, Card, Eyebrow, H1, H2, KV, P } from '@/components/common/ui'
import { usePromotion } from '@/features/coupon/queries'

const ID = 'latte-set'

/** 14 프로모션 추천 (UF-07 3) */
export default function PromotionDetailPage() {
  const { data: p } = usePromotion()
  return (
    <Screen title="프로모션 추천">
      <Eyebrow>AI 추천 · 승인 대기</Eyebrow>
      <H1>{p.title}</H1>
      <Card>
        <H2>왜 이 프로모션인가요?</H2>
        <P tone="ink">
          최근 2주 평일 오후 주문이 25% 줄었고, 금요일·월요일에 비 예보가 있어요. 비 오는 날 잘 나가는 바닐라 라떼를
          세트로 묶어 한가한 시간대 방문을 늘려요.
        </P>
      </Card>
      <Card>
        <H2>할인 조건</H2>
        <KV label="혜택" value={p.benefit} />
        <KV label="적용 메뉴" value={p.menu} />
        <KV label="정가 → 프로모션가" value={p.price} />
        <KV label="이용 시간" value={p.time} />
        <KV label="기간" value={p.period} />
        <KV label="수량 · 횟수" value={p.limit} />
        <KV label="중복 할인" value="불가 · 매장 주문 전용" tone="sub" />
        <div>
          <Button variant="text" to={`/promotions/${ID}/edit`}>
            조건 수정
          </Button>
        </div>
      </Card>
      <Card>
        <KV label="최대 할인 부담" value={p.maxDiscount} />
        <KV label="예상 마진율" value={p.margin} tone="deep" />
        <KV label="예상 추가 주문" value="하루 6건" />
      </Card>
      <Button to={`/promotions/${ID}/approve`}>발행 여부 결정</Button>
    </Screen>
  )
}
