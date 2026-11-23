import { Screen } from '@/components/common/layout'
import { Button, Card, Eyebrow, H1, KV, P, Stepper } from '@/components/common/ui'
import { useCouponDraft } from '@/features/coupon/useCouponDraft'

const ID = 'latte-set'

/** 16-1 POS 반영 결과 — 성공 (UF-07 7) */
export default function PromotionResultPage() {
  const name = useCouponDraft((s) => s.promotionName)
  return (
    <Screen title="POS 반영 결과">
      <Eyebrow>{name}</Eyebrow>
      <H1>{'POS에 프로모션이\n등록됐어요'}</H1>
      <Card>
        <Stepper steps={['승인', '반영 요청', '반영 완료', '사용 집계']} current={2} />
      </Card>
      <Card tone="line">
        <KV label="승인" value="11.19 16:02" />
        <KV label="POS 반영" value="완료 · 16:03" tone="ok" />
        <KV label="운영 기간" value="11.20–11.26" />
        <KV label="사용 내역" value="운영 시작 후 집계" tone="sub" />
      </Card>
      <Card tone="amber">
        <Eyebrow tone="amber">반영이 실패하거나 결과 확인 중이면</Eyebrow>
        <P tone="ink">
          실패 사유와 함께 다시 시도할 수 있어요. 이미 등록됐는지 먼저 확인해서 중복 등록을 막고, 조건이 바뀌었으면 다시
          승인을 받아요.
        </P>
      </Card>
      <Button to="/sales/promotions">사용 현황 보기</Button>
      <Button variant="outline" to={`/promotions/${ID}`}>
        등록한 조건 보기
      </Button>
    </Screen>
  )
}
