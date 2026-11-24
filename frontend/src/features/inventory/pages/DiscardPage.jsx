import { Screen } from '@/components/common/layout'
import { Button, Card, Chips, Field, H2, KV, Label } from '@/components/common/ui'

/** 23-1 폐기·손실 등록 (UF-11 3B) */
export default function DiscardPage() {
  return (
    <Screen title="재고 조정">
      <Chips items={['실사', '폐기', '손실']} defaultIndex={1} links={['/inventory/adjust', null, null]} />
      <Card>
        <KV label="품목" value="우유 1L" />
        <KV label="현재 추정 재고" value="3개" />
      </Card>
      <Field label="폐기 수량" defaultValue="1개" />
      <Field label="발생 시점" defaultValue="2026.11.19 21:00" />
      <Label>사유</Label>
      <Chips items={['소비기한 지남', '파손', '품질 이상', '기타']} />
      <Card tone="line">
        <H2>반영 결과</H2>
        <KV label="변동" value="−1개 (폐기)" tone="warn" />
        <KV label="보정 후 재고" value="2개" tone="deep" />
        <KV label="원가 손실" value="2,800원" tone="sub" />
      </Card>
      <Button to="/inventory">저장</Button>
    </Screen>
  )
}
