import { Screen } from '@/components/common/layout'
import { Button, ButtonRow, Card, Chips, Eyebrow, H2, KV, ListRow, P } from '@/components/common/ui'

/** 17 실행 결과 (UF-20) */
export default function ResultsPage() {
  return (
    <Screen title="실행 결과">
      <Chips items={['전체', '발주', '정정 요청', 'POS 반영']} equal />
      <Card tone="line" gap="gap-0" pad="px-4 py-1">
        <ListRow title="우유 10개 발주" value="성공" to="/orders/o1" />
        <ListRow title="원두 2kg 발주" value="재승인 필요" to="/reapproval/o2" />
        <ListRow title="컵 500개 발주" value="부분 성공" to="/orders/o1" />
        <ListRow title="라떼 세트 POS 반영" value="반영 완료" to="/promotions/latte-set/result" />
        <ListRow title="주말 아침 프로모션 POS 반영" value="반영 실패" to="/promotions/latte-set/result-failed" />
      </Card>
      <Card tone="warn">
        <Eyebrow tone="warn">부분 성공 · 컵 500개 발주</Eyebrow>
        <H2>공급처 재고가 부족해 주문이 거절됐어요</H2>
        <P>함께 보낸 다른 품목은 정상 접수돼서 다시 보내지 않아요.</P>
        <ButtonRow>
          <Button variant="outline">대체 공급처 보기</Button>
          <Button>다시 시도</Button>
        </ButtonRow>
      </Card>
      <Card>
        <H2>이력</H2>
        <KV label="제안" value="11.18 09:00 · 재고 부족" />
        <KV label="수정" value="수량 12 → 10 · 이유: 재고 상황" />
        <KV label="승인" value="11.18 09:12" />
        <KV label="실행 결과" value="성공" tone="ok" />
      </Card>
    </Screen>
  )
}
