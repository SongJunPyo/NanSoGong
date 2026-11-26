import { useLocation, useNavigate } from 'react-router-dom'
import { Screen } from '@/components/common/layout'
import { Button, Card, Chips, Eyebrow, Field, Label, Toggle } from '@/components/common/ui'
import { toast } from '@/components/ui/toast'

/** 54 프로모션 운영 설정 (UF-07 1) — 상단 프로모션 아이콘으로 열고, 저장하면 들어온 화면으로 돌아간다 */
export default function PromotionSettingsPage() {
  const navigate = useNavigate()
  const location = useLocation()

  // TODO API 가 생기면 useMutation 으로 저장한다
  const save = () => {
    toast('프로모션 운영 설정을 저장했어요')
    // 주소로 바로 들어와 돌아갈 화면이 없으면 홈으로
    if (location.key === 'default') navigate('/', { replace: true })
    else navigate(-1)
  }

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
      <Button onClick={save}>저장</Button>
    </Screen>
  )
}
