import { Screen } from '@/components/common/layout'
import { Button, Card, Chips, Eyebrow, Field, H1, H2, KV, Label } from '@/components/common/ui'
import PromotionNameField from '@/features/coupon/components/PromotionNameField'

const ID = 'latte-set'

/** 15 프로모션 조건 수정 (UF-07 4 · UF-19 2A 수정 이유) */
export default function PromotionEditPage() {
  return (
    <Screen title="조건 수정">
      <Eyebrow>바닐라 라떼 + 휘낭시에 세트</Eyebrow>
      <H1>{'바꾸고 싶은 조건을\n수정하세요'}</H1>
      <PromotionNameField help="AI가 지은 이름이에요. 사장님이 원하는 이름으로 바꿀 수 있어요." />
      <Field label="할인액" defaultValue="1,000원" />
      <Field label="이용 시간" defaultValue="평일 14:00–17:00" />
      <Field label="기간" defaultValue="11.20 – 11.26" />
      <Field label="발행 수량" defaultValue="30장" />
      <Field label="1인당 사용 횟수" defaultValue="1회" />
      <Label>날씨 조건</Label>
      <Chips items={['상관없이', '비 오는 날만']} defaultIndex={1} />
      <p className="text-base font-bold text-ink">수정한 이유를 알려주세요</p>
      <Chips items={['할인이 너무 커요', '시간대가 안 맞아요', '메뉴를 바꾸고 싶어요', '기타']} />
      <Field label="직접 입력 (선택)" placeholder="예: 오후 3시 이후에 손님이 더 없어요" />
      <Card>
        <H2>다시 계산한 손익</H2>
        <KV label="최대 할인 부담" value="30,000원" />
        <KV label="예상 마진율" value="54%" tone="deep" />
      </Card>
      <Button to={`/promotions/${ID}`}>이 조건으로 다시 검토</Button>
    </Screen>
  )
}
