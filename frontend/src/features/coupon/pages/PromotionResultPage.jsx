import { Screen } from '@/components/common/layout'
import { Button, Card, Eyebrow, H1, KV, P, Stepper } from '@/components/common/ui'
import { useCouponDraft } from '@/features/coupon/useCouponDraft'
import { DoneCheck } from '@/components/ui/agent-steps'

const ID = 'latte-set'

/** 16-1 POS 반영 결과 — 성공 (UF-07 7) */
export default function PromotionResultPage() {
  const name = useCouponDraft((s) => s.promotionName)
  return (
    <Screen title="POS 반영 결과">
      <div className="flex flex-col items-center gap-2 pt-4 text-center">
        <DoneCheck size={56} />
        <Eyebrow>{name}</Eyebrow>
        <H1>{'POS에 프로모션이\n등록됐어요'}</H1>
      </div>
      <Card>
        <Stepper steps={['승인', '반영 요청', '반영 완료', '사용 집계']} current={2} />
      </Card>
      <Card tone="line">
        <KV label="승인" value="11.19 16:02" />
        <KV label="POS 반영" value="완료 · 16:03" tone="ok" />
        <KV label="운영 기간" value="11.20–11.26" />
        <KV label="사용 내역" value="운영 시작 후 집계" tone="sub" />
      </Card>
      <Button to="/sales/promotions">사용 현황 보기</Button>
      <Button variant="outline" to={`/promotions/${ID}`}>
        등록한 조건 보기
      </Button>
      <P tone="mute" small>
        사용 내역은 운영이 시작되면 매일 모아서 보여 드려요.
      </P>
    </Screen>
  )
}
