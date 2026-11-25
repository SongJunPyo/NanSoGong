import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Screen } from '@/components/common/layout'
import { Button, Card, Divider, Eyebrow, H1, KV, P, Stepper } from '@/components/common/ui'
import { useCouponDraft } from '@/features/coupon/useCouponDraft'
import { usePromotion } from '@/features/coupon/queries'
import { DoneCheck } from '@/components/ui/agent-steps'
import { Sheet } from '@/components/ui/sheet'

/** 16-1 POS 반영 결과 — 성공 (UF-07 7) */
export default function PromotionResultPage() {
  const name = useCouponDraft((s) => s.promotionName)
  const { data: p } = usePromotion()
  const [conditionsOpen, setConditionsOpen] = useState(false)
  const navigate = useNavigate()

  // 등록을 마쳤으니 승인 화면들로 되돌아가지 않게 한다 — 기록을 [… 홈, 프로모션 성과] 로 만들어
  // 성과 화면에서 뒤로(헤더 · 휴대폰 뒤로 버튼 모두) 가면 홈으로 간다
  const goPerformance = () => {
    navigate('/', { replace: true })
    navigate('/sales/promotions')
  }
  return (
    <Screen title="POS 반영 결과" backTo="/">
      <div className="flex flex-col items-center gap-2 pt-4 text-center">
        <DoneCheck size={56} />
        <Eyebrow>{name}</Eyebrow>
        <H1>{'POS에 프로모션이\n등록됐어요'}</H1>
      </div>
      {/* 반영까지 끝났고, 지금은 사용 집계 중 */}
      <Card tone="line" pad="px-3 py-5">
        <Stepper steps={['승인', '반영 요청', '반영 완료', '사용 집계']} current={3} />
      </Card>
      <Card tone="line">
        <KV label="승인" value="11.19 16:02" />
        <KV label="POS 반영" value="완료 · 16:03" tone="ok" />
        <KV label="운영 기간" value="11.20–11.26" />
        <KV label="사용 내역" value="운영 시작 후 집계" tone="sub" />
      </Card>
      <Button onClick={goPerformance}>사용 현황 보기</Button>
      {/* 이미 등록된 조건은 다시 결정할 일이 아니라서, 화면 이동 없이 창으로 보여 준다 */}
      <Button variant="outline" onClick={() => setConditionsOpen(true)}>
        등록한 조건 보기
      </Button>
      <Sheet
        open={conditionsOpen}
        onOpenChange={setConditionsOpen}
        title="등록한 조건"
        description={`${name} · POS에 반영된 조건이에요.`}
        footer={
          <Button variant="outline" onClick={() => setConditionsOpen(false)}>
            닫기
          </Button>
        }
      >
        <div className="flex flex-col gap-2.5 pb-2">
          <KV label="혜택" value={p.benefit} />
          <KV label="적용 메뉴" value={p.menu} />
          <KV label="정가 → 프로모션가" value={p.price} />
          <KV label="이용 시간" value={p.time} />
          <KV label="기간" value={p.period} />
          <KV label="수량 · 횟수" value={p.limit} />
          <KV label="중복 할인" value="불가 · 매장 주문 전용" tone="sub" />
          <Divider />
          <KV label="최대 할인 부담" value={p.maxDiscount} />
          <KV label="예상 마진율" value={p.margin} tone="deep" />
        </div>
      </Sheet>
      <P tone="mute" small>
        사용 내역은 운영이 시작되면 매일 모아서 보여 드려요.
      </P>
    </Screen>
  )
}
