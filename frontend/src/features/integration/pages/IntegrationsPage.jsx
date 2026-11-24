import { Screen } from '@/components/common/layout'
import { Button, ButtonRow, Card, HeadRow, KV, Label, P, Pill, Pills } from '@/components/common/ui'

/** 53 연동 관리 (UF-03 6~8) */
export default function IntegrationsPage() {
  return (
    <Screen title="연동 관리">
      <Card>
        <HeadRow title="POS" size="text-base">
          <Pill tone="ok">연결됨</Pill>
        </HeadRow>
        <KV label="최근 동기화" value="오늘 09:12" />
        <Label>지원 기능</Label>
        <Pills items={['판매·메뉴', '프로모션 등록 ✓', '프로모션 사용 내역 ✓']} />
        <ButtonRow>
          <Button variant="outline">재동기화</Button>
          <Button variant="outline">연결 해제</Button>
        </ButtonRow>
      </Card>
      <Card>
        <HeadRow title="식자재 발주 서비스" size="text-base">
          <Pill tone="ok">연결됨</Pill>
        </HeadRow>
        <KV label="최근 동기화" value="오늘 08:40" />
        <Label>지원 기능</Label>
        <Pills items={['발주 전송 ✓', '정정 요청 전송 ✓', '배송 상태']} />
        <ButtonRow>
          <Button variant="outline">재동기화</Button>
          <Button variant="outline">연결 해제</Button>
        </ButtonRow>
      </Card>
      <Card tone="warn">
        <HeadRow title="금융 연동 (마이데이터)" size="text-base">
          <Pill tone="warnWhite">실패</Pill>
        </HeadRow>
        <KV label="마지막 성공" value="11.17 23:00" />
        <P>
          그 뒤 입출금은 ‘없음’이 아니라 ‘확인 불가’로 표시돼요. 매출 조회와 직접 입력한 비용 분석은 계속 쓸 수 있어요.
        </P>
        <Button to="/onboarding/connect/auth">정보 보완 후 다시 연결</Button>
      </Card>
    </Screen>
  )
}
