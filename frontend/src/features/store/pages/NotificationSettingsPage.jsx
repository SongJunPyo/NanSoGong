import { Screen } from '@/components/common/layout'
import { Card, Chips, Toggle } from '@/components/common/ui'

/** 55 알림 설정 */
export default function NotificationSettingsPage() {
  return (
    <Screen title="알림 설정">
      <Card tone="line" pad="px-4 py-1" gap="gap-0">
        <Toggle label="주간 재고 정비" desc="매주 월요일 오전 9시" />
        <Toggle label="소비기한 임박" />
        <Toggle label="발주 승인 요청" />
        <Toggle label="입고 확인 요청" />
        <Toggle label="날씨 변화 알림" desc="비·폭염·한파 예보로 수요가 바뀔 때" />
      </Card>
      <p className="text-[15px] font-bold text-ink">프로모션 제안 노출</p>
      <Chips items={['홈에 표시', '프로모션 화면에서만']} defaultIndex={1} />
    </Screen>
  )
}
