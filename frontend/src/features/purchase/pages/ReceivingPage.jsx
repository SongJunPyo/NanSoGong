import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Screen } from '@/components/common/layout'
import InventoryTabs from '@/features/inventory/components/InventoryTabs'
import { Button, Card, Divider, Eyebrow, Field, H1, H2, HeadRow, KV, P } from '@/components/common/ui'
import { Badge } from '@/components/ui/badge'
import { QuantityInput } from '@/components/ui/quantity-input'
import { InlineError } from '@/components/ui/inline-error'
import { ButtonLoading } from '@/components/ui/loading'
import { Sheet, SheetRadioList } from '@/components/ui/sheet'
import { toast } from '@/components/ui/toast'
import { useConfirmDelivery, useDeliveries } from '@/features/purchase/queries'
import { EmptyState } from '@/components/ui/empty-state'
import { SkeletonCard } from '@/components/ui/loading'

const PROBLEM_ERROR_ID = 'receiving-problem-error'
// 28 정정 요청 화면과 같은 요청 종류
const CORRECTION_TYPES = ['재배송', '교환', '환불']

const n = (v) => (v === '' ? 0 : v)

/**
 * 27 입고 확인 (UF-14 1~3)
 *   ① 오늘 온 품목마다 받은 수량 · 소비기한을 입력
 *   ② 다 받은 뒤 마지막에 한 번만 "파손되거나 잘못 온 게 있나요?" → 있으면 품목별로 파손 · 오배송 수량
 *   정상 = 받은 수량 − 파손 − 오배송. 확정하면 정상 수량만 재고에 더한다
 */
export default function ReceivingPage() {
  const deliveries = useDeliveries()
  return (
    <Screen title="재고" back={false} tab wide>
      <InventoryTabs />
      {deliveries.isPending ? (
        <SkeletonCard lines={4} />
      ) : deliveries.error ? (
        <Card tone="warn">
          <p role="alert" className="text-label text-danger">{deliveries.error.message}</p>
          <Button variant="outline" onClick={() => deliveries.refetch()}>다시 불러오기</Button>
        </Card>
      ) : deliveries.data.length === 0 ? (
        <EmptyState kind="done" title="확인할 입고가 없어요" description="오늘 도착한 물건을 모두 확인했어요." />
      ) : (
        // 입고 줄이 바뀌면(부분 입고 뒤 다시 열기 등) 입력 칸을 새로 만든다
        <ReceivingForm key={deliveries.data.map((d) => `${d.id}:${d.remaining}`).join('|')} lines={deliveries.data} />
      )}
    </Screen>
  )
}

/**
 * @param lines api/purchase.js 의 getDeliveries 결과 — remaining: 이번에 받을 수 있는 최대 수량 (주문 − 이미 받은 수량)
 */
function ReceivingForm({ lines }) {
  const navigate = useNavigate()
  const confirmDelivery = useConfirmDelivery()
  // 화면을 열 때 한 번 만든 요청 id — 두 번 눌러도 · 다시 시도해도 같은 입고는 한 번만 반영된다
  const [requestId] = useState(() => crypto.randomUUID())
  const DELIVERY = lines.map((d) => ({ ...d, key: d.id, ordered: d.remaining, total: d.ordered, already: d.received }))
  const byItem = (fn) => Object.fromEntries(DELIVERY.map((d) => [d.key, fn(d)]))
  const [received, setReceived] = useState(() => byItem((d) => d.ordered))
  const [expires, setExpires] = useState(() => byItem((d) => d.expiresAt))
  const [hasProblem, setHasProblem] = useState(null) // null = 아직 답하지 않음
  const [problem, setProblem] = useState(() => byItem(() => ({ broken: 0, wrong: 0 })))
  const [sheetOpen, setSheetOpen] = useState(false)
  const [correction, setCorrection] = useState(null) // 미리 고르지 않는다

  // 품목별 계산
  const rows = DELIVERY.map((d) => {
    const got = n(received[d.key])
    const bad = hasProblem ? n(problem[d.key].broken) + n(problem[d.key].wrong) : 0
    const receivedError =
      received[d.key] === '' || got < 0 ? '0개 이상 입력해 주세요' : got > d.ordered ? `${d.already ? '남은' : '주문'} 수량(${d.ordered}개)보다 많아요` : ''
    return { ...d, got, bad, ok: Math.max(0, got - bad), missing: Math.max(0, d.ordered - got), receivedError }
  })
  const totalBad = rows.reduce((sum, r) => sum + r.bad, 0)
  const over = rows.find((r) => r.bad > r.got)
  const problemError = !hasProblem
    ? ''
    : DELIVERY.some((d) => Object.values(problem[d.key]).some((v) => v === '' || v < 0))
      ? '0개 이상 입력해 주세요'
      : totalBad === 0
        ? '파손이나 오배송 수량을 입력해 주세요'
        : over
          ? `${over.name}은 받은 수량(${over.got}개)보다 많아요`
          : ''
  const canConfirm = rows.every((r) => !r.receivedError) && hasProblem !== null && !problemError
  const needsCorrection = rows.some((r) => r.bad > 0 || r.missing > 0)
  const totalOk = rows.reduce((sum, r) => sum + r.ok, 0)

  const confirm = () => {
    confirmDelivery.mutate(
      { requestId, lines: rows.map((r) => ({ deliveryId: r.id, got: r.got, ok: r.ok, expiresAt: expires[r.key] || null })) },
      {
        onSuccess: () => {
          toast(totalOk ? `${rows.filter((r) => r.ok > 0).length}개 품목을 재고에 더했어요` : '정상 수량이 없어 재고는 그대로예요')
          navigate('/inventory')
        },
        onError: (err) => toast(err.message, { tone: 'error' }),
      },
    )
  }

  const sendCorrection = () => {
    setSheetOpen(false)
    toast(`${correction} 요청을 보냈어요`)
    navigate('/corrections/c1')
  }

  return (
    <>
      <Eyebrow>오늘 도착 · {DELIVERY.length}개 품목</Eyebrow>
      <H1>{'받은 수량을\n입력해 주세요'}</H1>

      {/* ① 품목마다 받은 수량 */}
      {rows.map((r) => (
        <Card key={r.key}>
          <HeadRow title={r.name} size="text-base">
            {r.got === r.ordered && !r.receivedError ? <Badge status="done">주문과 같음</Badge> : <Badge>확인 필요</Badge>}
          </HeadRow>
          {r.already > 0 ? (
            <KV label="주문 · 이미 받음 · 남음" value={`${r.total} · ${r.already} · ${r.ordered}개`} />
          ) : (
            <KV label="주문 수량" value={`${r.ordered}개`} />
          )}
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <label htmlFor={`receiving-${r.key}`} className="text-label font-medium text-ink">
                받은 수량
              </label>
              <div className="ml-auto">
                <QuantityInput
                  id={`receiving-${r.key}`}
                  value={received[r.key]}
                  onChange={(v) => setReceived((s) => ({ ...s, [r.key]: v }))}
                  min={0}
                  max={r.ordered}
                  unit="개"
                  invalid={!!r.receivedError}
                  errorId={`receiving-${r.key}-error`}
                />
              </div>
            </div>
            <InlineError id={`receiving-${r.key}-error`}>
              {r.receivedError || (r.missing > 0 ? `${r.missing}개가 덜 왔어요. 미입고로 남겨요.` : '')}
            </InlineError>
          </div>
          {r.expiresAt !== null && (
            <Field
              label="소비기한"
              placeholder={r.expiresAt}
              value={expires[r.key]}
              onChange={(e) => setExpires((s) => ({ ...s, [r.key]: e.target.value }))}
            />
          )}
        </Card>
      ))}

      {/* ② 다 받은 뒤 한 번만 묻는다 — 답해야 확정할 수 있다 */}
      <Card>
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-body font-bold text-ink">파손되거나 잘못 온 게 있나요?</legend>
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
            <div className="flex flex-col gap-3 pt-2">
              <P small>문제가 있는 품목에만 수량을 넣어 주세요.</P>
              {rows.map((r) => (
                <div key={r.key} className="flex flex-col gap-2 rounded-input bg-white p-3">
                  <p className="text-label font-bold text-ink">
                    {r.name} <span className="font-normal text-ink-sub">· 받은 {r.got}개</span>
                  </p>
                  {[
                    ['broken', '파손', 'text-danger'],
                    ['wrong', '오배송', 'text-ink'],
                  ].map(([k, label, tone]) => (
                    <div key={k} className="flex items-center gap-3">
                      <label htmlFor={`receiving-${r.key}-${k}`} className={`w-14 text-label font-medium ${tone}`}>
                        {label}
                      </label>
                      <div className="ml-auto">
                        <QuantityInput
                          id={`receiving-${r.key}-${k}`}
                          value={problem[r.key][k]}
                          onChange={(v) => setProblem((s) => ({ ...s, [r.key]: { ...s[r.key], [k]: v } }))}
                          min={0}
                          max={r.got}
                          unit="개"
                          errorId={PROBLEM_ERROR_ID}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ))}
              <InlineError id={PROBLEM_ERROR_ID}>{problemError}</InlineError>
            </div>
          )}
        </fieldset>
      </Card>

      {/* 답한 뒤 품목별 반영 결과 */}
      {hasProblem !== null && (
        <Card tone="line">
          <H2>재고에 반영돼요</H2>
          {rows.map((r) => (
            <div key={r.key} className="flex flex-col gap-1">
              <KV label={`${r.name} 정상`} value={`+${r.ok}개`} tone="deep" />
              {r.bad > 0 && <KV label="보류 (파손·오배송)" value={`${r.bad}개`} tone="warn" />}
              {r.missing > 0 && <KV label="미입고" value={`${r.missing}개`} />}
            </div>
          ))}
          <Divider />
          <P tone="mute" small>
            정상으로 확정한 수량만 재고에 더해요. 파손·오배송은 따로 보류해 둬요.
          </P>
        </Card>
      )}

      <ButtonLoading loading={confirmDelivery.isPending} loadingText="재고에 더하고 있어요" disabled={!canConfirm} onClick={confirm}>
        {hasProblem === null ? '파손 여부를 골라 주세요' : '입고 확정'}
      </ButtonLoading>
      {canConfirm && needsCorrection && (
        <Button variant="outline" onClick={() => setSheetOpen(true)}>
          정정 요청 (부족·파손·오배송)
        </Button>
      )}

      <Sheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        title="무엇을 요청할까요?"
        description={rows
          .filter((r) => r.bad > 0 || r.missing > 0)
          .map((r) => `${r.name} · 보류 ${r.bad}개 · 미입고 ${r.missing}개`)
          .join(' / ')}
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
    </>
  )
}
