import { useNavigate } from 'react-router-dom'
import { Screen } from '@/components/common/layout'
import { Button, Card, ListRow, P } from '@/components/common/ui'
import { useStoreInfo } from '@/features/store/queries'

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
  const { data: store } = useStoreInfo()
  const navigate = useNavigate()
  return (
    <Screen title="설정">
      <Card>
        <div className="flex items-center gap-3">
          <span className="size-11 rounded-full bg-woori-deep" />
          <div>
            <p className="text-base font-bold text-ink">{store.owner} 사장님</p>
            <P small>{store.name}</P>
          </div>
        </div>
      </Card>
      <Group title="계정">
        <ListRow title="회원 정보" to="/settings/member" />
        <ListRow title="매장 정보" value="성수동" to="/settings/store" />
      </Group>
      <Group title="연동">
        <ListRow title="POS·외부 서비스 연동" value="2/3 연결" to="/settings/integrations" />
        <ListRow title="쇼핑몰 AI 대신 주문" value="쿠팡 연결" to="/settings/agent-order" />
      </Group>
      <Group title="운영">
        <ListRow title="프로모션 운영 설정" value="월 30만원" to="/settings/promotion" />
        <ListRow title="알림 설정" to="/settings/notifications" />
        <ListRow title="운영 일정 관리" to="/schedule/new" />
      </Group>
      <Group title="보안">
        <ListRow title="민감 정보 잠금" value="켜짐" to="/settings/lock" />
      </Group>
      <Button variant="outline" onClick={() => navigate('/login')}>
        로그아웃
      </Button>
    </Screen>
  )
}
