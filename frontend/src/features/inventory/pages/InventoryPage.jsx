import { Screen } from '@/components/common/layout'
import { Button, Card, Chips, Eyebrow, Field, H2, ListRow, P } from '@/components/common/ui'
import { useInventory } from '@/features/inventory/queries'

/** 21 재고 (UF-10) */
export default function InventoryPage() {
  const { data: items } = useInventory()
  return (
    <Screen title="재고" back={false} tab>
      <div className="flex justify-end -mb-2">
        <Button variant="text" to="/orders">
          발주 목록 보기 ›
        </Button>
      </div>
      <Field placeholder="품목 검색" />
      <Chips items={['전체', '부족 2', '소비기한 임박 1', '실사 필요']} />
      <Card tone="warn">
        <Eyebrow tone="warn">부족 예상</Eyebrow>
        <H2>우유 1L · 추정 4개</H2>
        <P>내일 비 예보로 사용량이 늘어 내일 오전 소진 예상이에요.</P>
        <Button to="/orders/recommendation">발주 추천 보기</Button>
      </Card>
      <Card tone="line" gap="gap-0" pad="px-4 py-1">
        {items.map((i) => (
          <ListRow key={i.id} title={i.name} value={i.value} to={`/inventory/items/${i.id}`} />
        ))}
      </Card>
      <P tone="mute" small>
        추정 재고는 POS 판매·레시피로 계산한 값이에요 · 마지막 실사 11.15
      </P>
      <Button variant="outline" to="/inventory/items/milk/edit">
        + 품목 추가·수정
      </Button>
    </Screen>
  )
}
