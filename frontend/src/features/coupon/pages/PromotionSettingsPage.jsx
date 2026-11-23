import { Screen } from '@/components/common/layout'
import { Button, Card, Chips, Eyebrow, Field, Label, Toggle } from '@/components/common/ui'

/** 54 프로모션 운영 설정 (UF-07 1) */
export default function PromotionSettingsPage() {
  return (
    <Screen title="프로모션 운영 설정">
      <Eyebrow>AI가 프로모션을 추천할 때 지켜요</Eyebrow>
      <Label>목표</Label>
      <Chips items={['비수기 매출', '재방문', '신규 고객']} />
      <Field label="월 예산" defaultValue="300,000원" />
      <Field label="제외 메뉴" defaultValue="시즌 음료" />
      <Field label="제외 시간대" defaultValue="12:00 – 13:00 (점심 피크)" />
      <Card tone="line" pad="px-4 py-1">
        <Toggle label="날씨 맞춤 추천" desc="비·한파 예보가 있으면 따뜻한 메뉴 위주로 추천해요" />
      </Card>
      <Button variant="outline">POS 이력에서 불러오기</Button>
      <Button to="/settings">저장</Button>
    </Screen>
  )
}
