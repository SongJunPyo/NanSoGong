import { Screen } from '@/components/common/layout'
import { Card, ListRow, P } from '@/components/common/ui'
import { useMyMember, useMyStores, useLogout } from '@/hooks/useAuthSession'
import { useStoreSelection } from '@/store/useStoreSelection'
import AuthButton from '@/components/auth/AuthButton'

const Group = ({ title, children }) => (
  <>
    <p className="text-[13px] font-bold text-ink-mute">{title}</p>
    <Card tone="line" gap="gap-0" pad="px-4 py-1">
      {children}
    </Card>
  </>
)

/** 51 설정 */
export default function SettingsPage() {
  const member = useMyMember()
  const stores = useMyStores()
  const storeId = useStoreSelection(state => state.storeId)
  const store = stores.data?.find(item => item.storeId === storeId)
  const logout = useLogout()
  return (
    <Screen title="설정">
      <Card>
        <div className="flex items-center gap-3">
          <span className="size-11 rounded-full bg-woori-deep" />
          <div>
            <p className="text-base font-bold text-ink">{member.data?.name ? `${member.data.name} 사장님` : '회원정보 조회 중'}</p>
            <P small>{store?.name ?? store?.bizName ?? '선택한 매장이 없어요.'}</P>
          </div>
        </div>
      </Card>
      <Group title="계정">
        <ListRow title="회원 정보" to="/settings/member" />
        <ListRow title="매장 정보" value={store?.address ?? ''} to="/settings/store" />
      </Group>
      <Group title="연동">
        <ListRow title="POS·외부 서비스 연동" value="2/3 연결" to="/settings/integrations" />
        <ListRow title="쇼핑몰 AI 대신 주문" value="쿠팡 연결" to="/settings/agent-order" />
      </Group>
      <Group title="운영">
        <ListRow title="알림 설정" to="/settings/notifications" />
        <ListRow title="운영 일정 관리" to="/schedule/new" />
      </Group>
      <Group title="보안">
        <ListRow title="민감 정보 잠금" value="켜짐" to="/settings/lock" />
      </Group>
      <AuthButton variant="outline" busy={logout.pending} onClick={logout.submit}>
        로그아웃
      </AuthButton>
    </Screen>
  )
}
