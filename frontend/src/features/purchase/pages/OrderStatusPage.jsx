import { Screen } from '@/components/common/layout'
import { Button, Card, Eyebrow, H1, HeadRow, KV, P, Pill, Stepper } from '@/components/common/ui'

/** 26 발주 상태 — 전송 결과·예외 (UF-13) */
export default function OrderStatusPage() {
  return (
    <Screen title="발주 상세">
      <Eyebrow>11.19 승인 · 3개 품목</Eyebrow>
      <H1>발주 진행 상황</H1>
      <Card>
        <HeadRow title="우유 1L × 10" size="text-base">
          <Pill tone="deep">배송 중</Pill>
        </HeadRow>
        <Stepper steps={['접수', '배송', '부분 입고', '확인 필요', '입고 완료']} current={1} />
        <KV label="○○유통 · 전송" value="성공 · 11.19 15:40" />
      </Card>
      <Card tone="amber">
        <HeadRow title="원두 1kg × 2" size="text-base">
          <Pill tone="amberWhite">재승인 대기</Pill>
        </HeadRow>
        <P tone="ink">승인 뒤 단가가 바뀌어서 아직 보내지 않았어요. 바뀐 조건을 확인하고 다시 승인해 주세요.</P>
        <Button variant="outline" to="/reapproval/o2">
          재승인하기
        </Button>
      </Card>
      <Card tone="warn">
        <HeadRow title="컵 16oz × 500" size="text-base">
          <Pill tone="warnWhite">전송 실패</Pill>
        </HeadRow>
        <P tone="ink">□□포장은 앱 연동이 안 돼요. 아래 조건으로 직접 주문한 뒤 내역을 등록해 주세요.</P>
        <KV label="주문 조건" value="500개 · 51,200원" />
        <Button variant="outline" to="/orders/o1/direct">
          직접 주문 내역 등록
        </Button>
      </Card>
      <Button to="/receiving">입고 확인하기</Button>
    </Screen>
  )
}
