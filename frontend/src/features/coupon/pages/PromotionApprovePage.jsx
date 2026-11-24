import { useNavigate } from 'react-router-dom'
import { Screen } from '@/components/common/layout'
import { Button, ButtonRow, Card, Eyebrow, H1, HeadRow, KV, P, Pill } from '@/components/common/ui'
import PromotionNameField from '@/features/coupon/components/PromotionNameField'
import { usePromotion } from '@/features/coupon/queries'

const ID = 'latte-set'

/** 16 발행 여부 결정 — 승인 시 POS 역동기화 (UF-07 5) */
export default function PromotionApprovePage() {
  const { data: p } = usePromotion()
  const navigate = useNavigate()
  return (
    <Screen title="발행 여부 결정">
      <Eyebrow>최종 확인</Eyebrow>
      <H1>{'이 조건으로\n승인할까요?'}</H1>
      <PromotionNameField help="POS에 이 이름으로 등록돼요. 20자까지 바꿀 수 있어요." />
      <Card>
        <KV label="적용 메뉴" value={p.menu} />
        <KV label="혜택" value={p.benefit} />
        <KV label="기간 · 시간" value="11.20–11.26 · 14–17시" />
        <KV label="사용 한도 · 제한" value={p.limit} />
        <KV label="최대 할인 부담" value={p.maxDiscount} tone="deep" />
      </Card>
      <Card tone="line">
        <HeadRow title="승인하면 POS에 등록돼요" size="text-base">
          <Pill tone="ok">POS 지원</Pill>
        </HeadRow>
        <P tone="ink">승인한 조건 그대로 연동된 POS에 프로모션으로 등록해요. 보류·반려하면 POS에 보내지 않아요.</P>
      </Card>
      <Button onClick={() => navigate(`/promotions/${ID}/result`)}>승인하고 POS에 등록</Button>
      <ButtonRow>
        <Button variant="secondary" onClick={() => navigate('/on-hold')}>
          보류
        </Button>
        <Button variant="secondary" to="/reject">
          반려
        </Button>
      </ButtonRow>
    </Screen>
  )
}
