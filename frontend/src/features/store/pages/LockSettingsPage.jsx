import { Screen } from '@/components/common/layout'
import { Card, ListRow, Toggle } from '@/components/common/ui'

/** 56 민감 정보 잠금 */
export default function LockSettingsPage() {
  return (
    <Screen title="민감 정보 잠금">
      <Card tone="line" pad="px-4 py-1">
        <Toggle label="민감 정보 잠금 사용" desc="선택한 화면에 들어갈 때 비밀번호를 물어봐요" />
      </Card>
      <p className="text-[13px] font-bold text-ink-mute">잠글 화면</p>
      <Card tone="line" pad="px-4 py-1" gap="gap-0">
        <Toggle label="매출" />
        <Toggle label="비용·예상 이익" />
        <Toggle label="프로모션 성과" defaultChecked={false} />
      </Card>
      <Card tone="line" gap="gap-0" pad="px-4 py-1">
        <ListRow title="잠금 비밀번호 변경" to="/lock" />
      </Card>
    </Screen>
  )
}
