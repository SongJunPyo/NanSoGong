import { Screen } from '@/components/common/layout'
import { Button, ButtonRow, Card, Eyebrow, H1, HeadRow, KV, P, Pill } from '@/components/common/ui'

const HOLD = [
  {
    kind: '발주',
    title: '컵 16oz × 500',
    sub: '11.19 보류 · 51,200원',
    state: '도착 3일 필요',
    to: '/orders/recommendation',
  },
  {
    kind: '프로모션',
    title: '주말 아침 아메리카노',
    sub: '11.17 보류 · 할인 부담 20,000원',
    state: '기간 지남',
    warn: true,
    to: '/promotions/latte-set',
  },
  { kind: '정정 요청', title: '원두 오배송 1개', sub: '11.15 보류', state: '거래처 연락 대기', to: '/corrections/new' },
]

/** 18-2 보류한 일 (UF-19 2B) */
export default function OnHoldPage() {
  return (
    <Screen title="보류한 일">
      <Eyebrow>보류 {HOLD.length}건</Eyebrow>
      <H1>{'나중에 다시\n검토할 일이에요'}</H1>
      {HOLD.map((h) => (
        <Card key={h.title} tone="line">
          <HeadRow title={h.title} size="text-base">
            <Pill>{h.kind}</Pill>
          </HeadRow>
          <P small>{h.sub}</P>
          <KV label="지금 상태" value={h.state} tone={h.warn ? 'warn' : 'ink'} />
          <ButtonRow>
            <Button to={h.to}>다시 검토</Button>
            <Button variant="secondary" to="/reject">
              반려
            </Button>
          </ButtonRow>
        </Card>
      ))}
    </Screen>
  )
}
