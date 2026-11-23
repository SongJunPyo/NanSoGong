import { Screen } from '@/components/common/layout'
import { Button, Card, Eyebrow, H1, H2, HeadRow, KV, ListRow, Stepper } from '@/components/common/ui'

const ID = 'latte-set'

/** 16-2 POS 반영 실패 (UF-07 8 · UF-20) */
export default function PromotionResultFailedPage() {
  return (
    <Screen title="POS 반영 결과">
      <Eyebrow tone="warn">주말 아침 아메리카노</Eyebrow>
      <H1>{'POS 등록에\n실패했어요'}</H1>
      <Card tone="warn">
        <Stepper steps={['승인', '반영 요청', '반영 실패', '사용 집계']} current={2} failAt={2} />
        <KV label="실패 사유" value="POS가 세트 할인 형식을 지원하지 않음" tone="warn" />
        <KV label="요청 시각" value="11.19 16:03" />
      </Card>
      <Card>
        <H2>이렇게 해결할 수 있어요</H2>
        <ListRow title="메뉴별 할인으로 바꿔서 다시 승인" value="조건 수정" to={`/promotions/${ID}/edit`} />
        <ListRow title="POS 연동 상태 확인" value="연동 관리" to="/settings/integrations" />
      </Card>
      <Card tone="line">
        <HeadRow title="다시 시도하기 전에 확인했어요" size="text-[15px]" />
        <KV label="POS에 이미 등록됨" value="아니요 · 중복 없음" tone="ok" />
        <KV label="승인한 조건과 같음" value="예" tone="ok" />
      </Card>
      <Button to={`/promotions/${ID}/result`}>다시 시도</Button>
      <Button variant="outline" to="/results">
        나중에 할게요
      </Button>
    </Screen>
  )
}
