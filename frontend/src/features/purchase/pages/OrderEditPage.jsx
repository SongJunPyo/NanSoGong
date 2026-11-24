import { Screen } from '@/components/common/layout'
import { Button, Card, Chips, Eyebrow, Field, H1, H2, KV, P } from '@/components/common/ui'

/** 25 발주 조건 수정 (UF-12 3A·3B) */
export default function OrderEditPage() {
  return (
    <Screen title="발주 수정">
      <Eyebrow>우유 1L</Eyebrow>
      <H1>{'수량·공급처를\n바꿀 수 있어요'}</H1>
      <Field label="수량" defaultValue="12 → 10" />
      <Field label="공급처" defaultValue="○○유통" />
      <p className="text-base font-bold text-ink">수정한 이유를 알려주세요</p>
      <Chips items={['레시피 사용량', '재고 상황', '공급처', '기타']} defaultIndex={1} />
      <Field label="직접 입력 (선택)" placeholder="예: 다음 주 이틀 휴무라 덜 써요" />
      <Card>
        <H2>다시 계산한 발주안</H2>
        <KV label="총액" value="139,200원" tone="deep" />
        <KV label="도착 예정" value="11.20" />
        <KV label="예상 소진" value="11.21 오후" />
      </Card>
      <Button to="/orders/recommendation">수정 내용으로 다시 검토</Button>
      <P tone="mute" small>
        수정 이유와 이력은 다음 추천에 참고해요.
      </P>
    </Screen>
  )
}
