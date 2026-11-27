import { useState } from 'react'
import { Screen } from '@/components/common/layout'
import { Button, Card, Chips, Eyebrow, Field, H1, H2, KV, P } from '@/components/common/ui'
import { won } from '@/lib/format'
import { useOrderRecommendation } from '@/features/purchase/queries'
import { QuantityInput } from '@/components/ui/quantity-input'
import { InlineError } from '@/components/ui/inline-error'

const ITEM_ID = 'milk'
const QTY_ERROR_ID = 'order-edit-qty-error'

/** 25 발주 조건 수정 (UF-12 3A·3B) */
export default function OrderEditPage() {
  const { data: r } = useOrderRecommendation()
  const item = r.items.find((it) => it.id === ITEM_ID)
  const [qty, setQty] = useState(10) // AI 추천 12개 → 사장님이 10개로 줄인 예시

  const qtyError = qty === '' || qty < 1 ? '1개 이상 입력해 주세요' : ''

  // 다시 계산한 총액 = 다른 품목 + 이 품목(개당가 × 수량) + 배송비
  const unitPrice = item.price / item.qty
  const others = r.items.filter((it) => it.id !== ITEM_ID).reduce((sum, it) => sum + it.price, 0)
  const shipping = Number(String(r.shipping).replace(/[^\d]/g, '')) || 0
  const total = qtyError ? null : others + unitPrice * qty + shipping

  return (
    <Screen title="발주 수정">
      <Eyebrow>{item.product}</Eyebrow>
      <H1>{'수량·공급처를\n바꿀 수 있어요'}</H1>
      <div className="flex flex-col gap-2">
        <label htmlFor="order-edit-qty" className="text-[13px] font-medium text-ink-sub">
          수량 <span className="text-ink-mute">(AI 추천 {item.qty}개)</span>
        </label>
        <QuantityInput
          id="order-edit-qty"
          value={qty}
          onChange={setQty}
          min={0}
          unit={item.unit}
          invalid={!!qtyError}
          errorId={QTY_ERROR_ID}
        />
        <InlineError id={QTY_ERROR_ID}>{qtyError}</InlineError>
      </div>
      <Field label="공급처" defaultValue={item.supplier} />
      <p className="text-base font-bold text-ink">수정한 이유를 알려주세요</p>
      <Chips items={['레시피 사용량', '재고 상황', '공급처', '기타']} defaultIndex={1} />
      <Field label="직접 입력 (선택)" placeholder="예: 다음 주 이틀 휴무라 덜 써요" />
      <Card>
        <H2>다시 계산한 발주안</H2>
        <KV label="총액 (배송비 포함)" value={total == null ? '—' : `${won(total)}원`} tone="deep" />
        <KV label="도착 예정" value={item.arrive} />
        <KV label="예상 소진" value="내일 오전" />
      </Card>
      {qtyError ? (
        <button
          type="button"
          disabled
          className="h-[52px] w-full rounded-button bg-woori-deep text-base font-bold text-white opacity-50"
        >
          수정 내용으로 다시 검토
        </button>
      ) : (
        <Button to="/orders/recommendation">수정 내용으로 다시 검토</Button>
      )}
      <P tone="mute" small>
        수정 이유와 이력은 다음 추천에 참고해요.
      </P>
    </Screen>
  )
}
