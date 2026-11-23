import { useState } from 'react'
import { Screen } from '@/components/common/layout'
import { Button, Card, Eyebrow, H1, HeadRow, KV, P, Pill, Stepper } from '@/components/common/ui'
import { won } from '@/lib/format'
import { channelOf, directOrderPath, eunNeun } from '@/features/purchase/channels'
import ExternalOrderSheet from '@/features/purchase/components/ExternalOrderSheet'
import { useOrderRecommendation } from '@/features/purchase/queries'

const ORDER_ID = 'o1'

/** 26 발주 상태 — 전송 결과 · 예외 · 외부 주문 (UF-13) */
export default function OrderStatusPage() {
  const { data: r } = useOrderRecommendation()
  const cup = r.items.find((it) => channelOf(it).kind === 'link')
  const [sheetOpen, setSheetOpen] = useState(false)
  return (
    <Screen title="발주 상세">
      <Eyebrow>11.19 승인 · 3개 품목</Eyebrow>
      <H1>발주 진행 상황</H1>
      <Card>
        <HeadRow title="우유 1L × 10" size="text-base">
          <Pill tone="deep">배송 중</Pill>
        </HeadRow>
        <Stepper steps={['접수', '배송', '부분 입고', '확인 필요', '입고 완료']} current={1} />
        <KV label="○○유통 · 앱에서 전송" value="성공 · 11.19 15:40" />
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
      {cup && (
        <Card tone="line">
          <HeadRow title={`${cup.product} × ${cup.qty}`} size="text-base">
            <Pill tone="amber">{channelOf(cup).label} 주문 필요</Pill>
          </HeadRow>
          <P tone="ink">
            {eunNeun(channelOf(cup).label)} 앱에서 대신 주문할 수 없어요. 검색 화면을 열어드릴게요. 주문하고 돌아오면
            내역만 등록하면 돼요.
          </P>
          <KV label="주문 조건" value={`${cup.qty}개 · 예상 ${won(cup.price)}원`} />
          <Button onClick={() => setSheetOpen(true)}>{channelOf(cup).label}에서 주문하기</Button>
          <Button variant="outline" to={directOrderPath(ORDER_ID, cup)}>
            이미 주문했어요 · 내역 등록
          </Button>
        </Card>
      )}
      <Button variant="outline" to="/receiving">
        입고 확인하기
      </Button>
      {cup && <ExternalOrderSheet open={sheetOpen} onClose={() => setSheetOpen(false)} orderId={ORDER_ID} item={cup} />}
    </Screen>
  )
}
