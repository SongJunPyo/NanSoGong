import { Screen } from '@/components/common/layout'
import { Button, Card, Chips, Eyebrow, Field, H1, KV, P } from '@/components/common/ui'

/** 18-1 반려 사유 (UF-19 2C) */
export default function RejectPage() {
  return (
    <Screen title="반려하기">
      <Eyebrow>원두 1kg × 2 발주</Eyebrow>
      <H1>{'반려하는 이유를\n알려주세요'}</H1>
      <P>이유를 알려주시면 다음 추천에 반영해요.</P>
      <Chips
        items={[
          '지금은 필요 없어요',
          '금액이 부담돼요',
          '시기가 안 맞아요',
          '직접 처리할게요',
          '추천이 틀렸어요',
          '기타',
        ]}
        defaultIndex={1}
      />
      <Field label="직접 입력 (선택)" placeholder="예: 다음 주에 원두 거래처를 바꿀 예정이에요" />
      <Card tone="line">
        <KV label="반려하면" value="실행하지 않고 이력에 남아요" />
        <KV label="비슷한 제안" value="7일간 덜 보여줘요" />
      </Card>
      <Button to="/results">반려하기</Button>
      <Button variant="outline" onClick={() => window.history.back()}>
        취소
      </Button>
    </Screen>
  )
}
