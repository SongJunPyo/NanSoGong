import { Screen } from '@/components/common/layout'
import { Button, Card, Eyebrow, Field, H1, H2, HeadRow, KV, P, Pill, Toggle } from '@/components/common/ui'

/** 04-1 연동 인증 (UF-03 1~2) */
export default function ConnectAuthPage() {
  return (
    <Screen title="식자재 발주 서비스">
      <Eyebrow>서비스 연결</Eyebrow>
      <H1>{'계정 정보를 입력하면\n바로 연결해요'}</H1>
      <Card>
        <H2>연결하면 가져오는 정보</H2>
        <KV label="재고·거래처·공급 품목" value="가져옴" />
        <KV label="단가·주문 단위·배송 정보" value="가져옴" />
        <KV label="발주 전송 · 정정 요청 전송" value="지원" tone="ok" />
      </Card>
      <Field label="서비스 아이디" placeholder="아이디" />
      <Field label="비밀번호 또는 인증키" placeholder="••••••••" />
      <Card tone="line" pad="px-[18px] py-1">
        <Toggle label="정보 제공에 동의합니다" desc="연결 해제하면 언제든 철회할 수 있어요" />
      </Card>
      <Button to="/onboarding/connect">연결하기</Button>
      <Card tone="ok">
        <HeadRow title="연결 성공" size="text-base">
          <Pill tone="okWhite">방금</Pill>
        </HeadRow>
        <P tone="ink">거래처 12곳, 공급 품목 86개를 불러왔어요. 확인이 필요한 항목 3개는 초기 재고에서 보여드려요.</P>
      </Card>
    </Screen>
  )
}
