import { Screen } from '@/components/common/layout'
import { Button, Card, Eyebrow, Field, H1, HeadRow, ListRow, P, Pill } from '@/components/common/ui'

/** 05 초기 재고 입력 (UF-04 1~2) */
export default function InitialStockPage() {
  const items = [
    ['원두 1kg', '2.1 kg'],
    ['우유 1L', '6 개'],
    ['바닐라 시럽', '2 병'],
    ['컵 16oz', '단가 없음'],
    ['뚜껑', '공급처 없음'],
  ]
  return (
    <Screen title="초기 재고">
      <Eyebrow>초기 설정 2/3</Eyebrow>
      <H1>지금 있는 재고를 알려주세요</H1>
      <P>연동으로 불러온 품목이에요. 빠진 정보는 채우고 현재 수량을 입력하세요.</P>
      <Field label="기준 일시" defaultValue="2026.11.19 09:00" />
      <Card tone="amber">
        <HeadRow title="확인이 필요한 품목 3개" size="text-base">
          <Pill tone="amberWhite">정보 부족</Pill>
        </HeadRow>
        <P tone="ink">단위·포장 규격·단가·공급처 중 빠진 정보가 있어요. 품목을 눌러 채워 주세요.</P>
      </Card>
      <Card tone="line" gap="gap-0" pad="px-4 py-1">
        {items.map(([t, v]) => (
          <ListRow key={t} title={t} value={v} to="/inventory/items/milk/edit" />
        ))}
      </Card>
      <Button variant="secondary" to="/inventory/items/new/edit">
        + 품목 추가
      </Button>
      <Button to="/onboarding/recipe">저장하고 다음</Button>
    </Screen>
  )
}
