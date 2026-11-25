import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Screen } from '@/components/common/layout'
import { Card, Chips, Field, H2, KV, Label } from '@/components/common/ui'
import { won } from '@/lib/format'
import { QuantityInput } from '@/components/ui/quantity-input'
import { InlineError } from '@/components/ui/inline-error'
import { ButtonLoading } from '@/components/ui/loading'
import { toast } from '@/components/ui/toast'

const STOCK = 3 // 현재 추정 재고 (목업)
const UNIT_COST = 2800 // 우유 1L 개당 원가 (목업)
const QTY_ERROR_ID = 'discard-qty-error'

/** 23-1 폐기·손실 등록 (UF-11 3B) */
export default function DiscardPage() {
  const navigate = useNavigate()
  const [qty, setQty] = useState(1)
  const [saving, setSaving] = useState(false)

  const error =
    qty === '' || qty < 1 ? '1개 이상 입력해 주세요' : qty > STOCK ? `현재 재고(${STOCK}개)보다 많이 뺄 수 없어요` : ''

  const save = () => {
    setSaving(true)
    setTimeout(() => {
      toast(`폐기 ${qty}개를 기록했어요`)
      navigate('/inventory')
    }, 600)
  }

  return (
    <Screen title="재고 조정">
      <Chips items={['실사', '폐기', '손실']} defaultIndex={1} links={['/inventory/adjust', null, null]} />
      <Card>
        <KV label="품목" value="우유 1L" />
        <KV label="현재 추정 재고" value={`${STOCK}개`} />
      </Card>
      <div className="flex flex-col gap-2">
        <label htmlFor="discard-qty" className="text-[13px] font-medium text-ink-sub">
          폐기 수량
        </label>
        <QuantityInput id="discard-qty" value={qty} onChange={setQty} min={0} max={STOCK} unit="개" invalid={!!error} errorId={QTY_ERROR_ID} />
        <InlineError id={QTY_ERROR_ID}>{error}</InlineError>
      </div>
      <Field label="발생 시점" defaultValue="2026.11.19 21:00" />
      <Label>사유</Label>
      <Chips items={['소비기한 지남', '파손', '품질 이상', '기타']} />
      <Card tone="line">
        <H2>반영 결과</H2>
        <KV label="변동" value={error ? '—' : `−${qty}개 (폐기)`} tone="warn" />
        <KV label="보정 후 재고" value={error ? '—' : `${STOCK - qty}개`} tone="deep" />
        <KV label="원가 손실" value={error ? '—' : `${won(UNIT_COST * qty)}원`} tone="sub" />
      </Card>
      <ButtonLoading loading={saving} loadingText="저장하고 있어요" disabled={!!error} onClick={save}>
        저장
      </ButtonLoading>
    </Screen>
  )
}
