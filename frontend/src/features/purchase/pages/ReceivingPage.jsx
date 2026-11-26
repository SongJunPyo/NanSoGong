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
import { useReceiveInventoryItem } from '@/features/inventory/queries'

const RECEIVED_ERROR_ID = 'receiving-received-error'
const PROBLEM_ERROR_ID = 'receiving-problem-error'
const PROBLEM_ROWS = [
  ['broken', '파손', 'text-danger'],
  ['wrong', '오배송', 'text-ink'],
]
// 28 정정 요청 화면과 같은 요청 종류
const CORRECTION_TYPES = ['재배송', '교환', '환불']
// 목업 주문 — 우유 1L 10개 (재고 품목 id: milk)
const ORDER = { itemId: 'milk', ordered: 10, receivedAt: '2026-11-26' }

/**
 * 27 입고 확인 (UF-14 1~3)
 *   ① 받은 수량을 먼저 입력 → ② 마지막에 "파손 · 오배송이 있나요?" 를 묻는다
 *   정상 = 받은 수량 − 파손 − 오배송. 확정하면 정상 수량만 재고에 더한다
 */
export default function ReceivingPage() {
  const navigate = useNavigate()
  const receive = useReceiveInventoryItem()
  const [received, setReceived] = useState(ORDER.ordered)
  const [hasProblem, setHasProblem] = useState(null) // null = 아직 답하지 않음
  const [problem, setProblem] = useState({ broken: 1, wrong: 0 })
  const [expiresAt, setExpiresAt] = useState('2026-11-28')
  const [sheetOpen, setSheetOpen] = useState(false)
  const [correction, setCorrection] = useState(null) // 미리 고르지 않는다

  const n = (v) => (v === '' ? 0 : v)
  const bad = hasProblem ? n(problem.broken) + n(problem.wrong) : 0
  const ok = Math.max(0, n(received) - bad)
  const missing = Math.max(0, ORDER.ordered - n(received))

  const receivedError =
    received === '' || received < 0
      ? '0개 이상 입력해 주세요'
      : received > ORDER.ordered
        ? `주문 수량(${ORDER.ordered}개)보다 많아요`
        : ''
  const problemError = !hasProblem
    ? ''
    : Object.values(problem).some((v) => v === '' || v < 0)
      ? '0개 이상 입력해 주세요'
      : bad === 0
        ? '파손이나 오배송 수량을 입력해 주세요'
        : bad > n(received)
          ? `받은 수량(${n(received)}개)보다 많아요`
          : ''
  const canConfirm = !receivedError && hasProblem !== null && !problemError
  const needsCorrection = bad > 0 || missing > 0

  const confirm = () => {
    if (ok === 0) {
      toast('정상 수량이 없어 재고는 그대로예요')
      navigate('/inventory')
      return
    }
    receive.mutate(
      { id: ORDER.itemId, qty: ok, receivedAt: ORDER.receivedAt, expiresAt },
      {
        onSuccess: () => {
          toast(`우유 1L ${ok}개를 재고에 더했어요`)
          navigate('/inventory')
        },
        onError: (err) => toast(err.message),
      },
    )
  }

  const sendCorrection = () => {
    setSheetOpen(false)
    toast(`${correction} 요청을 보냈어요`)
    navigate('/corrections/c1')
  }

  return (
    <Screen title="입고 확인">
      <Eyebrow>오늘 도착 · 2개 품목</Eyebrow>
      <H1>{'받은 수량을\n입력해 주세요'}</H1>
      <Card>
        <HeadRow title="우유 1L" size="text-base">
          <Badge>확인 필요</Badge>
        </HeadRow>
        <KV label="주문 수량" value={`${ORDER.ordered}개`} />
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <label htmlFor="receiving-received" className="text-label font-medium text-ink">
              받은 수량
            </label>
            <div className="ml-auto">
              <QuantityInput
                id="receiving-received"
                value={received}
                onChange={setReceived}
                min={0}
                max={ORDER.ordered}
                unit="개"
                invalid={!!receivedError}
                errorId={RECEIVED_ERROR_ID}
              />
            </div>
          </div>
          <InlineError id={RECEIVED_ERROR_ID}>
            {receivedError || (missing > 0 ? `${missing}개가 덜 왔어요. 미입고로 남겨요.` : '')}
          </InlineError>
        </div>
        <Field label="소비기한" placeholder="2026-11-28" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />

        {/* 마지막 질문 — 답해야 확정할 수 있다 */}
        <Divider />
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-label font-bold text-ink">파손되거나 잘못 온 게 있나요?</legend>
          <div className="grid grid-cols-2 gap-2">
            {[
              [false, '없어요'],
              [true, '있어요'],
            ].map(([value, label]) => (
              <button
                key={label}
                type="button"
                aria-pressed={hasProblem === value}
                onClick={() => setHasProblem(value)}
                className={`h-11 rounded-input border text-label font-bold focus-visible:outline-2 focus-visible:outline-woori-blue ${
                  hasProblem === value ? 'border-woori-deep bg-woori-deep text-white' : 'border-line bg-white text-ink hover:bg-surface-muted'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          {hasProblem && (
            <div className="flex flex-col gap-2 pt-1">
              {PROBLEM_ROWS.map(([k, label, tone]) => (
                <div key={k} className="flex items-center gap-3">
                  <label htmlFor={`receiving-${k}`} className={`w-14 text-label font-medium ${tone}`}>
                    {label}
                  </label>
                  <div className="ml-auto">
                    <QuantityInput
                      id={`receiving-${k}`}
                      value={problem[k]}
                      onChange={(v) => setProblem((p) => ({ ...p, [k]: v }))}
                      min={0}
                      max={n(received)}
                      unit="개"
                      invalid={!!problemError}
                      errorId={PROBLEM_ERROR_ID}
                    />
                  </div>
                </div>
              ))}
              <InlineError id={PROBLEM_ERROR_ID}>{problemError}</InlineError>
            </div>
          )}
        </fieldset>

        {hasProblem !== null && (
          <>
            <Divider />
            <KV label="재고에 더할 정상 수량" value={`+${ok}개`} tone="deep" />
            {bad > 0 && <KV label="보류 (파손·오배송)" value={`${bad}개`} tone="warn" />}
            {missing > 0 && <KV label="미입고" value={`${missing}개`} />}
          </>
        )}
      </Card>
      <Card>
        <HeadRow title="원두 1kg" size="text-base">
          <Badge status="done">일치</Badge>
        </HeadRow>
        <KV label="주문 / 정상" value="2 / 2" />
      </Card>
      <ButtonLoading loading={receive.isPending} loadingText="재고에 더하고 있어요" disabled={!canConfirm} onClick={confirm}>
        {hasProblem === null ? '파손 여부를 골라 주세요' : `정상 ${ok}개 입고 확정`}
      </ButtonLoading>
      {canConfirm && needsCorrection && (
        <Button variant="outline" onClick={() => setSheetOpen(true)}>
          정정 요청 (부족·파손·오배송)
        </Button>
      )}
      <P tone="mute" small>
        정상으로 확정한 수량만 재고에 더해요. 파손·오배송은 따로 보류해 둬요.
      </P>

      <Sheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        title="무엇을 요청할까요?"
        description={`우유 1L · 파손 ${hasProblem ? n(problem.broken) : 0}개 · 오배송 ${hasProblem ? n(problem.wrong) : 0}개 · 미입고 ${missing}개`}
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
