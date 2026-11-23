import { Screen } from '@/components/common/layout'
import { BarChart, Card, Chips, H2, HeadRow, KV, ListRow, P, Pill } from '@/components/common/ui'
import { useCouponDraft } from '@/features/coupon/useCouponDraft'

/** 44 프로모션 성과 (UF-08) */
export default function PromotionPerformancePage() {
  const name = useCouponDraft((s) => s.promotionName)
  return (
    <Screen title="프로모션 성과">
      <Chips items={['진행 중', '종료']} />
      <Card>
        <HeadRow title={name} size="text-base">
          <Pill tone="ok">POS 반영 완료</Pill>
        </HeadRow>
        <KV label="승인" value="11.19" />
        <KV label="운영 기간" value="11.20–11.26" />
        <KV label="사용 건수" value="12건" />
        <KV label="사용률 (사용 한도 30장 기준)" value="40%" tone="deep" />
        <div className="flex items-center gap-2">
          <span className="text-label text-ink-sub">발행량</span>
          <span className="ml-auto">
            <Pill tone="amber">확인 불가 · POS 미제공</Pill>
          </span>
        </div>
        <KV label="누적 할인액" value="12,000원" />
        <KV label="프로모션 적용 매출" value="84,000원" />
        <P tone="mute" small>
          최근 수집 11.20 18:00 · 취소 1건 반영
        </P>
      </Card>
      <Card tone="line">
        <H2>효과 비교</H2>
        <Chips items={['운영 기간 vs 직전 2주', '지난주 같은 요일']} />
        <BarChart values={[9, 14]} highlight={1} labels={['직전 2주', '운영 기간']} />
        <KV label="평일 오후 주문" value="하루 9건 → 14건" tone="deep" />
        <KV label="바닐라 라떼 판매" value="24% ↑" tone="deep" />
        <KV label="추천 때 예상" value="하루 +6건" />
        <P tone="mute" small>
          관측된 변화예요. 날씨 등 다른 요인도 있어서 전부 프로모션 효과라고 보긴 어려워요.
        </P>
      </Card>
      <Card tone="line" gap="gap-0" pad="px-4 py-1">
        <ListRow title="11.20 14:32 · 주문 #2041" value="사용" />
        <ListRow title="11.20 15:10 · 주문 #2057" value="사용" />
        <ListRow title="11.20 16:05 · 주문 #2063" value="취소" />
      </Card>
    </Screen>
  )
}
