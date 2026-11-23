import { Screen } from '@/components/common/layout'
import { Button, Card, Eyebrow, Field, H1, H2, KV } from '@/components/common/ui'

/** 26-1 직접 주문 등록 (UF-13 2B·3B) */
export default function DirectOrderPage() {
  return (
    <Screen title="직접 주문 등록">
      <Eyebrow>□□포장 · 앱 연동 안 됨</Eyebrow>
      <H1>{'직접 주문한 내용을\n등록해 주세요'}</H1>
      <Card>
        <H2>안내한 주문 조건</H2>
        <KV label="품목 · 수량" value="컵 16oz × 500" />
        <KV label="예상 금액" value="51,200원" />
        <Button variant="outline">주문 조건 복사</Button>
      </Card>
      <Field label="주문일" defaultValue="2026.11.19" />
      <div className="grid grid-cols-2 gap-2.5">
        <Field label="실제 수량" defaultValue="500" />
        <Field label="결제 금액" defaultValue="51,200원" />
      </div>
      <Field label="도착 예정일" defaultValue="2026.11.22" />
      <Field label="주문 방법 (선택)" placeholder="예: 전화 · 홈페이지" />
      <Button to="/orders/o1">등록하고 입고 관리로</Button>
    </Screen>
  )
}
