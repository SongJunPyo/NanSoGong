import { Screen } from '@/components/common/layout'
import { Button, Card, Eyebrow, H1, HeadRow, P, Pill, Pills } from '@/components/common/ui'

/** 04 서비스 연동 (UF-03) */
export default function ConnectPage() {
  return (
    <Screen title="서비스 연동">
      <Eyebrow>초기 설정 1/3</Eyebrow>
      <H1>매장 데이터를 연결해요</H1>
      <P>연결한 서비스마다 가져올 수 있는 정보와 지원 기능이 달라요.</P>
      <Card>
        <HeadRow title="POS" size="text-base">
          <Pill tone="ok">연결됨</Pill>
        </HeadRow>
        <Pills items={['판매·메뉴', '할인·취소·환불', '프로모션 등록', '프로모션 사용 내역']} />
      </Card>
      <Card>
        <HeadRow title="식자재 발주 서비스" size="text-base">
          <Pill tone="gray">미연결</Pill>
        </HeadRow>
        <Pills items={['재고·거래처', '단가·주문 단위', '배송 정보']} />
        <Button variant="outline" to="/onboarding/connect/auth">
          연결하기
        </Button>
      </Card>
      <Card tone="warn">
        <HeadRow title="금융 연동 (마이데이터)" size="text-base">
          <Pill tone="warnWhite">연결 실패</Pill>
        </HeadRow>
        <Pills items={['입출금 내역', '정산 입금', '비용 거래']} />
        <P>인증 정보를 확인한 뒤 다시 연결해 주세요.</P>
        <Button variant="outline">다시 연결</Button>
      </Card>
      <Button to="/onboarding/stock">다음</Button>
    </Screen>
  )
}
