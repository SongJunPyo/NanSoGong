import { Screen } from '@/components/common/layout'
import { Button, Card, Chips, Eyebrow, Field, H1, H2, HeadRow, KV, P, Pill } from '@/components/common/ui'

/** 21-1 품목 등록·수정 (UF-09) */
export default function ItemEditPage() {
  const pair = (a, b) => (
    <div className="grid grid-cols-2 gap-2.5">
      {a}
      {b}
    </div>
  )
  return (
    <Screen title="품목 수정">
      <Eyebrow>연동으로 불러온 정보 · 확인 필요 1개</Eyebrow>
      <H1>우유 1L</H1>
      <Field label="품목명" defaultValue="우유 1L" />
      {pair(<Field label="분류" defaultValue="유제품" />, <Field label="관리 단위" defaultValue="개" />)}
      {pair(<Field label="포장 규격" defaultValue="1L × 1개" />, <Field label="단가" defaultValue="2,800원" />)}
      <Card tone="amber">
        <HeadRow title="공급처" size="text-base">
          <Pill tone="amberWhite">확인 필요</Pill>
        </HeadRow>
        <P tone="ink">연동 정보에 공급처가 두 곳이에요. 주로 쓰는 곳을 골라주세요.</P>
        <Chips items={['○○유통', '△△마트']} />
      </Card>
      <Card tone="line">
        <H2>입고분별 소비기한</H2>
        <KV label="11.14 입고 · 3개" value="~11.22" />
        <KV label="11.17 입고 · 1개" value="~11.25" />
        <div>
          <Button variant="text">+ 입고분 추가</Button>
        </div>
      </Card>
      <Button to="/inventory">저장</Button>
      <div>
        <Button variant="text">품목 삭제</Button>
      </div>
    </Screen>
  )
}
