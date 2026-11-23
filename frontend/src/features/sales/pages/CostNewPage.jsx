import { Screen } from '@/components/common/layout'
import { Button, ButtonRow, Card, Chips, HeadRow, KV2, Label, P, Pill } from '@/components/common/ui'

function FieldRow({ label, value }) {
  return (
    <label className="flex flex-col gap-2">
      <Label>{label}</Label>
      <input
        defaultValue={value}
        className="h-[52px] w-full min-w-0 rounded-input bg-surface-muted px-4 text-body font-medium outline-none focus:ring-2 focus:ring-woori-blue"
      />
    </label>
  )
}

/** 43-1 비용 추가 (UF-18 2) */
export default function CostNewPage() {
  return (
    <Screen title="비용 추가">
      <Label>항목</Label>
      <Chips items={['임대료', '인건비', '수수료', '공과금', '포장재', '기타']} defaultIndex={3} />
      <FieldRow label="금액" value="240,000원" />
      <div className="grid grid-cols-2 gap-2.5">
        <FieldRow label="적용 시작" value="2026.11.01" />
        <FieldRow label="적용 끝" value="2026.11.30" />
      </div>
      <Label>반복</Label>
      <Chips items={['매월', '한 번만']} />
      <Card tone="amber">
        <HeadRow title="비슷한 거래가 있어요" size="text-base">
          <Pill tone="amberWhite">중복 후보</Pill>
        </HeadRow>
        <KV2 title="11.10 출금 · 관리비" sub="금융 연동" value="120,000원" />
        <P tone="ink">같은 비용이면 연결해서 한 번만 계산해요.</P>
        <ButtonRow>
          <Button variant="outline">같은 비용이에요</Button>
          <Button variant="outline">다른 비용이에요</Button>
        </ButtonRow>
      </Card>
      <Button to="/sales/costs">저장</Button>
    </Screen>
  )
}
