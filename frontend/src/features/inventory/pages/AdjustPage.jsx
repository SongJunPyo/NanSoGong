import { Screen } from '@/components/common/layout'
import { Button, Card, Chips, Field, H2, KV, P } from '@/components/common/ui'

const ADJUST_LINKS = [null, '/inventory/adjust/discard', '/inventory/adjust/discard']

/** 23 실사 등록 (UF-11 3A) */
export default function AdjustPage() {
  return (
    <Screen title="재고 조정">
      <Chips items={['실사', '폐기', '손실']} links={ADJUST_LINKS} />
      <Card>
        <KV label="품목" value="우유 1L" />
        <KV label="현재 추정 재고" value="4개" />
      </Card>
      <Field label="실제 확인 수량" defaultValue="3" />
      <Field label="실사 일시" defaultValue="2026.11.19 15:00" />
      <Card tone="line">
        <H2>반영 결과</H2>
        <KV label="차이" value="-1개" tone="warn" />
        <KV label="보정 후 재고" value="3개" tone="deep" />
      </Card>
      <Button to="/inventory">저장</Button>
      <P tone="mute" small>
        매주 월요일 오전 9시에 주간 재고 정비 알림을 보내요.
      </P>
    </Screen>
  )
}
