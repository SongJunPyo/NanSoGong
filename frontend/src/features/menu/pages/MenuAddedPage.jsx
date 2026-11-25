import { Screen } from '@/components/common/layout'
import { Button, Card, H2, P } from '@/components/common/ui'
import { useMenuWorkspace } from '@/features/menu/queries'
import MenuTabs from '@/features/menu/components/MenuTabs'

/** 기존 완료 주소 호환. 등록하지 않은 특정 메뉴가 등록됐다고 표시하지 않는다. */
export default function MenuAddedPage() {
  const { data: workspace } = useMenuWorkspace()
  const latest = workspace?.menus.find((menu) => menu.isNew && !menu.deletedAt)
  return (
    <Screen title="메뉴 등록 확인" tab>
      <MenuTabs />
      <Card tone="line"><H2>{latest ? latest.name + ' 등록 완료' : '메뉴 등록 확인'}</H2><P>{latest ? '메뉴 목록에 반영됐어요. 새 메뉴의 NEW 표시를 확인해 주세요.' : '추천 승인 후 상세 정보를 확인하고 메뉴 추가하기를 눌러야 목록에 등록돼요.'}</P><P small>앱 등록과 POS 판매 시작은 별도예요.</P></Card>
      <Button to="/menu">메뉴 관리로 이동</Button>
    </Screen>
  )
}
