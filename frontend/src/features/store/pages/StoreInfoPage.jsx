import { Screen } from '@/components/common/layout'
import { Button, Chips, Field } from '@/components/common/ui'

const ACCOUNT_TABS = ['/settings/member', '/settings/store']

/** 52 매장 정보 (UF-02) */
export default function StoreInfoPage() {
  return (
    <Screen title="매장 정보">
      <Chips items={['회원 정보', '매장 정보']} defaultIndex={1} links={[ACCOUNT_TABS[0], null]} />
      <Field label="매장명" defaultValue="성수 라떼하우스" />
      <Field label="업종" defaultValue="카페" />
      <Field label="주소 (날씨 기준 위치)" defaultValue="서울 성동구 성수이로 ○○" />
      <Field label="사업자등록번호" defaultValue="000-00-00000" />
      <Button variant="outline">+ 사업자등록번호 추가</Button>
      <Button>저장</Button>
    </Screen>
  )
}
