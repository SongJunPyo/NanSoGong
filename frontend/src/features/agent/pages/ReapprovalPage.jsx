import { Screen } from '@/components/common/layout'
import { Button, ButtonRow, Card, Eyebrow, H1, H2, KV, P } from '@/components/common/ui'

/** 18 재승인 요청 — 승인 후 조건 변경 (UF-19 3~5) */
export default function ReapprovalPage() {
  return (
    <Screen title="재승인 요청">
      <Eyebrow tone="amber">승인 후 조건이 바뀌었어요</Eyebrow>
      <H1>{'원두 발주를\n다시 승인해 주세요'}</H1>
      <P>승인한 범위를 벗어나서 기존 승인으로는 보내지 않았어요.</P>
      <Card tone="line">
        <H2>무엇이 바뀌었나요</H2>
        <KV label="공급처" value="△△로스터리 (같음)" />
        <KV label="단가" value="29,000 → 31,500원" tone="warn" />
        <KV label="총액" value="58,000 → 63,000원" tone="warn" />
        <KV label="도착 예정" value="11.21 → 11.22" tone="warn" />
      </Card>
      <Card>
        <H2>에이전트 의견</H2>
        <P tone="ink">다른 후보보다 여전히 총비용이 가장 낮아요. 11.22 도착이어도 재고가 버틸 수 있어요.</P>
      </Card>
      <Button to="/orders/o1">바뀐 조건으로 승인</Button>
      <ButtonRow>
        <Button variant="outline" to="/orders/recommendation/edit">
          조건 수정
        </Button>
        <Button variant="secondary" to="/on-hold">
          보류
        </Button>
        <Button variant="secondary" to="/reject">
          반려
        </Button>
      </ButtonRow>
    </Screen>
  )
}
