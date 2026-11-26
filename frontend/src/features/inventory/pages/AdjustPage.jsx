import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Screen } from '@/components/common/layout'
import { Card, Chips, Field, H2, KV, P } from '@/components/common/ui'
import { QuantityInput } from '@/components/ui/quantity-input'
import { InlineError } from '@/components/ui/inline-error'
import { ButtonLoading } from '@/components/ui/loading'
import { toast } from '@/components/ui/toast'
import { useAdjustInventoryItem, useInventory } from '@/features/inventory/queries'

const ADJUST_LINKS = [null, '/inventory/adjust/discard', '/inventory/adjust/discard']
const ITEM_ID = 'milk' // 목업: 우유 1L 실사
const QTY_ERROR_ID = 'adjust-qty-error'

// ⚠️ 가정: 추정 재고와 절반 이상(최소 2개) 차이 나면 '차이가 크다'고 본다. 저장은 막지 않고 한 번 더 확인만 부탁한다
const isBigGap = (diff, estimate) => Math.abs(diff) >= Math.max(2, Math.ceil(estimate * 0.5))

/** 23 실사 등록 (UF-11 3A) — 저장하면 센 수량으로 재고를 맞춘다 */
export default function AdjustPage() {
  const navigate = useNavigate()
  const { data: items } = useInventory()
  const adjust = useAdjustInventoryItem()
  const item = items.find((i) => i.id === ITEM_ID)
  // 현재 추정 재고 = 남은 입고분 합계 (구매 단위)
  const ESTIMATE = (item?.lots ?? []).reduce((sum, lot) => sum + lot.qty, 0)
  const [qty, setQty] = useState(3)
  const saving = adjust.isPending

  const invalid = qty === '' || qty < 0
  const diff = invalid ? 0 : qty - ESTIMATE
  const error = invalid
    ? '0개 이상 입력해 주세요'
    : isBigGap(diff, ESTIMATE)
      ? `추정 재고보다 ${Math.abs(diff)}개 ${diff < 0 ? '적어요' : '많아요'}. 한 번 더 세어 주세요`
      : ''

  const save = () => {
    adjust.mutate(
      { id: ITEM_ID, counted: qty, countedAt: '2026-11-26' },
      {
        onSuccess: () => {
          toast(`우유 1L 재고를 ${qty}개로 맞췄어요`)
          navigate('/inventory')
        },
        onError: (err) => toast(err.message),
      },
    )
  }

  return (
    <Screen title="재고 조정">
      <Chips items={['실사', '폐기', '손실']} links={ADJUST_LINKS} />
      <Card>
        <KV label="품목" value="우유 1L" />
        <KV label="현재 추정 재고" value={`${ESTIMATE}개`} />
      </Card>
      <div className="flex flex-col gap-2">
        <label htmlFor="adjust-qty" className="text-[13px] font-medium text-ink-sub">
          실제 확인 수량
        </label>
        <QuantityInput id="adjust-qty" value={qty} onChange={setQty} unit="개" invalid={!!error} errorId={QTY_ERROR_ID} />
        <InlineError id={QTY_ERROR_ID}>{error}</InlineError>
      </div>
      <Field label="실사 일시" defaultValue="2026.11.19 15:00" />
      <Card tone="line">
        <H2>반영 결과</H2>
        <KV label="차이" value={invalid ? '—' : `${diff > 0 ? '+' : diff < 0 ? '−' : ''}${Math.abs(diff)}개`} tone={diff < 0 ? 'warn' : 'ink'} />
        <KV label="보정 후 재고" value={invalid ? '—' : `${qty}개`} tone="deep" />
      </Card>
      <ButtonLoading loading={saving} loadingText="저장하고 있어요" disabled={invalid} onClick={save}>
        저장
      </ButtonLoading>
      <P tone="mute" small>
        매주 월요일 오전 9시에 주간 재고 정비 알림을 보내요.
      </P>
    </Screen>
  )
}
