import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Screen } from '@/components/common/layout'
import { Button, Card, Divider, Eyebrow, Field, H1, HeadRow, KV, P } from '@/components/common/ui'
import { Badge } from '@/components/ui/badge'
import { QuantityInput } from '@/components/ui/quantity-input'
import { InlineError } from '@/components/ui/inline-error'
import { ButtonLoading } from '@/components/ui/loading'
import { Sheet, SheetRadioList } from '@/components/ui/sheet'
import { toast } from '@/components/ui/toast'

const SUM_ERROR_ID = 'receiving-sum-error'
const ROWS = [
  ['ok', '정상', 'text-ink'],
  ['broken', '파손', 'text-danger'],
  ['wrong', '오배송', 'text-ink'],
]
// 28 정정 요청 화면과 같은 요청 종류
const CORRECTION_TYPES = ['재배송', '교환', '환불']

/** 27 입고 확인 — 정상·파손·오배송 구분 (UF-14 1~3) */
export default function ReceivingPage() {
  const navigate = useNavigate()
  const [qty, setQty] = useState({ ok: 9, broken: 1, wrong: 0 })
  const [saving, setSaving] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [correction, setCorrection] = useState(null) // 미리 고르지 않는다

  const ordered = 10
  const n = (v) => (v === '' ? 0 : v)
  const sum = n(qty.ok) + n(qty.broken) + n(qty.wrong)
  const missing = Math.max(0, ordered - sum)
  const hasEmpty = Object.values(qty).some((v) => v === '' || v < 0)

  // 합계가 주문 수량을 넘으면 확정할 수 없다. 모자라면 미입고로 남는다는 걸 알려만 준다
  const sumError = hasEmpty
    ? '0개 이상 입력해 주세요'
    : sum > ordered
      ? `합계(${sum}개)가 주문 수량(${ordered}개)보다 많아요`
      : ''
  const sumNotice = !sumError && missing > 0 ? `합계가 ${missing}개 모자라요. 모자란 수량은 미입고로 남겨요.` : ''

  const confirm = () => {
    setSaving(true)
    setTimeout(() => {
      toast(`${n(qty.ok)}개를 재고에 더했어요`)
      navigate('/inventory')
    }, 700)
  }

  const sendCorrection = () => {
    setSheetOpen(false)
    toast(`${correction} 요청을 보냈어요`)
    navigate('/corrections/c1')
  }

  return (
    <Screen title="입고 확인">
      <Eyebrow>오늘 도착 · 2개 품목</Eyebrow>
      <H1>{'받은 물건을\n상태별로 확인해 주세요'}</H1>
      <Card>
        <HeadRow title="우유 1L" size="text-base">
          <Badge>확인 필요</Badge>
        </HeadRow>
        <KV label="주문 / 기존 정상 입고" value={`${ordered} / 0`} />
        <div className="flex flex-col gap-2">
          {ROWS.map(([k, label, tone]) => (
            <div key={k} className="flex items-center gap-3">
              <label htmlFor={`receiving-${k}`} className={`w-14 text-label font-medium ${tone}`}>
                {label}
              </label>
              <div className="ml-auto">
                <QuantityInput
                  id={`receiving-${k}`}
                  value={qty[k]}
                  onChange={(v) => setQty((q) => ({ ...q, [k]: v }))}
                  min={0}
                  max={ordered}
                  unit="개"
                  invalid={!!sumError}
                  errorId={SUM_ERROR_ID}
                />
              </div>
            </div>
          ))}
          <InlineError id={SUM_ERROR_ID}>{sumError || sumNotice}</InlineError>
        </div>
        <Field label="소비기한" defaultValue="2026.11.28" />
        <Divider />
        <KV label="가용 재고 반영" value={`+${n(qty.ok)}개`} tone="deep" />
        <KV label="보류 (파손·오배송)" value={`${n(qty.broken) + n(qty.wrong)}개`} tone="warn" />
        <KV label="미입고" value={`${missing}개`} />
      </Card>
      <Card>
        <HeadRow title="원두 1kg" size="text-base">
          <Badge status="done">일치</Badge>
        </HeadRow>
        <KV label="주문 / 정상" value="2 / 2" />
      </Card>
      <ButtonLoading loading={saving} loadingText="재고에 더하고 있어요" disabled={!!sumError} onClick={confirm}>
        정상 수량 입고 확정
      </ButtonLoading>
      <Button variant="outline" onClick={() => setSheetOpen(true)}>
        정정 요청 (부족·파손·오배송)
      </Button>
      <P tone="mute" small>
        정상으로 확정한 수량만 재고에 더해요. 파손·오배송은 따로 보류해 둬요.
      </P>

      <Sheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        title="무엇을 요청할까요?"
        description={`우유 1L · 파손 ${n(qty.broken)}개 · 오배송 ${n(qty.wrong)}개 · 미입고 ${missing}개`}
        footer={
          <>
            <Button variant="outline" to="/corrections/new">
              자세히 작성
            </Button>
            <ButtonLoading disabled={!correction} onClick={sendCorrection}>
              요청 보내기
            </ButtonLoading>
          </>
        }
      >
        <SheetRadioList name="correction" options={CORRECTION_TYPES} value={correction} onChange={setCorrection} />
        <P small>사진 · 메모는 '자세히 작성'에서 붙일 수 있어요.</P>
      </Sheet>
    </Screen>
  )
}
