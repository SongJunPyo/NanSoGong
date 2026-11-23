import { Screen } from '@/components/common/layout'
import { Button, ButtonRow, Card, Eyebrow, H1, H2, KV, P, Stepper } from '@/components/common/ui'

/** 28-1 정정 요청 진행 (UF-14 6~8) */
export default function CorrectionProgressPage() {
  return (
    <Screen title="정정 요청 진행">
      <Eyebrow>우유 1L 파손 1개 · 재배송</Eyebrow>
      <H1>{'거래처가 요청을\n접수했어요'}</H1>
      <Card>
        <Stepper steps={['승인', '전달', '접수', '처리 완료']} current={2} />
        <KV label="전달" value="앱 연동 · 11.19 17:02" />
        <KV label="거래처 응답" value="11.21 재배송 예정" tone="deep" />
        <KV label="정보 출처" value="거래처 응답 · 17:20" tone="sub" />
      </Card>
      <Card tone="line">
        <H2>후속 결과 확인</H2>
        <KV label="재배송 1개" value="도착 전" />
        <KV label="파손 보류 1개" value="반품 예정" />
        <Button variant="outline" to="/receiving">
          재배송 도착 확인
        </Button>
      </Card>
      <Card tone="amber">
        <Eyebrow tone="amber">직접 전달한 경우</Eyebrow>
        <P tone="ink">전달했는지와 거래처 처리 결과를 직접 등록해 주세요.</P>
        <ButtonRow>
          <Button variant="outline">전달 완료 등록</Button>
          <Button variant="outline">처리 결과 등록</Button>
        </ButtonRow>
      </Card>
    </Screen>
  )
}
