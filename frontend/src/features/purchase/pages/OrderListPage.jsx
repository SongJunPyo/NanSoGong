import { Screen } from '@/components/common/layout'
import { Card, Chips, HeadRow, P, Pill } from '@/components/common/ui'
import { useOrders } from '@/features/purchase/queries'

/** 26-0 발주 목록 (UF-13 4) */
export default function OrderListPage() {
  const { data: orders } = useOrders()
  return (
    <Screen title="발주 목록">
      <Chips items={['진행 중 4', '완료', '실패·확인 필요 1']} />
      {orders.map((o) => (
        <Card key={o.id} tone="line" gap="gap-1.5" to={o.to}>
          <HeadRow title={o.title} size="text-base">
            <Pill tone={o.tone}>{o.status}</Pill>
          </HeadRow>
          <P small>{o.sub}</P>
        </Card>
      ))}
    </Screen>
  )
}
