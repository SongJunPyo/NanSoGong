import { useNavigate, useParams } from 'react-router-dom'
import { Screen } from '@/components/common/layout'
import { Card } from '@/components/common/ui'
import { SkeletonCard } from '@/components/ui/loading'
import { useMenuWorkspace } from '@/features/menu/queries'
import MenuForm from '@/features/menu/components/MenuForm'
import MenuTabs from '@/features/menu/components/MenuTabs'

/** 기존 상세 주소를 유지하며, 목록의 팝업과 같은 입력 폼을 사용한다. */
export default function MenuEditPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const query = useMenuWorkspace()
  const menu = query.data?.menus.find((entry) => entry.id === id || entry.posCode === id)
  return (
    <Screen title={id === 'new' ? '메뉴 추가' : '메뉴 수정'} tab>
      <MenuTabs />
      {query.isPending ? <SkeletonCard /> : query.error ? <Card tone="warn"><p role="alert">{query.error.message}</p></Card> : id !== 'new' && (!menu || menu.deletedAt) ? <Card tone="line"><p role="status" className="text-label text-ink-sub">메뉴를 찾을 수 없어요. 삭제된 메뉴는 메뉴 기록에서 복구해 주세요.</p><button type="button" onClick={() => navigate('/menu')} className="text-label font-bold text-woori-deep">메뉴 관리로 이동</button></Card> : <Card tone="line"><MenuForm key={id} initial={menu} onSaved={() => navigate('/menu')} onCancel={() => navigate('/menu')} /></Card>}
    </Screen>
  )
}
