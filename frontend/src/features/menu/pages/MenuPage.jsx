import { Screen } from '@/components/common/layout'
import { Button, Card, Chips, HeadRow, ListRow, P, Pill } from '@/components/common/ui'
import { useMenus } from '@/features/menu/queries'

const MENU_TABS = [null, '/menu/analysis', '/menu/recommendations']

/** 31 메뉴 목록 (UF-15) */
export default function MenuPage() {
  const { data: menus } = useMenus()
  return (
    <Screen title="메뉴" back={false} tab>
      <Chips items={['메뉴 관리', '판매 분석', 'AI 추천']} links={MENU_TABS} />
      <Card tone="line" gap="gap-0" pad="px-4 py-1">
        {menus.map((m) => (
          <ListRow key={m.id} title={m.name} value={m.value} to={`/menu/${m.id}/edit`} />
        ))}
      </Card>
      <Card tone="line">
        <HeadRow title="시즌 음료" size="text-[15px]">
          <Pill tone="gray">판매 중지</Pill>
        </HeadRow>
        <P tone="warn" small>
          POS 메뉴 연결 필요
        </P>
      </Card>
      <Button to="/menu/new/edit">+ 메뉴 추가</Button>
    </Screen>
  )
}
