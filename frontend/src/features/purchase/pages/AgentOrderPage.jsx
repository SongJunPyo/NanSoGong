import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Screen } from '@/components/common/layout'
import { Button, Card, Divider, Eyebrow, H1, KV, P } from '@/components/common/ui'
import { won } from '@/lib/format'
import { CHANNELS } from '@/features/purchase/channels'
import { useAgentOrder } from '@/features/purchase/queries'
import { AgentSteps, DoneCheck } from '@/components/ui/agent-steps'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { Modal } from '@/components/ui/modal'
import { Sheet } from '@/components/ui/sheet'

const TICK = 900 // 목업에서 단계 하나가 끝나는 시간 (ms)

// 화면에 보여 줄 4단계 ← 목업의 세부 단계 id 묶음 (목업 데이터는 그대로 둔다)
const DISPLAY_STEPS = [
  { label: (mall) => `${mall} 열기`, ids: ['search'] },
  { label: () => '상품 담기', ids: ['pick', 'cart'] },
  { label: () => '주문서 채우기', ids: ['sheet'] },
  { label: () => '결제 요청', ids: ['pay'] },
]

/**
 * 24-7 ~ 24-10 AI 대신 주문 (UF-13 2C)
 *
 * running  : AI가 쇼핑몰에서 검색 → 최저가 고르기 → 장바구니 → 주문서 작성 (24-7, AgentSteps)
 * stopped  : 멈춤 조건에 걸림 (예: 로켓배송 최소 금액) → 사장님 선택을 기다린다 (24-8)
 * approve  : 주문서 완성 → 결제 승인 Modal (24-9). 결제 비밀번호는 사장님이 쇼핑몰에서 직접 입력
 * done     : 주문번호 확인 · 장부 기록 (24-10)
 *
 * 🚨 AI 는 결제하지 않는다 — 결제는 Modal 에서 사장님이 확정하고, 쇼핑몰 결제 화면에서 직접 한다
 *
 * TODO 실제 서비스: 사장님 휴대폰의 에이전트가 단계별 상태를 서버로 보내고, 이 화면은 그 상태를 구독한다
 *      (예: GET /api/stores/{storeId}/agent-orders/{id} 를 TanStack Query 로 주기적으로 조회)
 * 주소에 ?case=ok 를 붙이면 멈춤 없이 끝까지 진행된다
 */
export default function AgentOrderPage() {
  const { data: a } = useAgentOrder()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const mall = CHANNELS[a.mall]
  const withStop = params.get('case') !== 'ok'

  const [done, setDone] = useState(0) // 끝난 세부 단계 수
  const [phase, setPhase] = useState('running')
  const [addons, setAddons] = useState([]) // 최소 금액을 채우려고 같이 담은 품목
  const [resolved, setResolved] = useState(!withStop)

  // 단계 진행 (목업 타이머)
  useEffect(() => {
    if (phase !== 'running') return undefined
    const t = setTimeout(() => {
      if (!resolved && done === a.stop.atStep) return setPhase('stopped')
      if (done === 4) return setPhase('approve') // 주문서까지 완성 → 결제 승인
      setDone((d) => d + 1)
    }, TICK)
    return () => clearTimeout(t)
  }, [phase, done, resolved, a.stop.atStep])

  // 결제 → 주문번호 확인 → 완료 (목업)
  useEffect(() => {
    if (phase !== 'paying') return undefined
    const t = setTimeout(() => {
      setDone(a.steps.length)
      setPhase('done')
    }, 1500)
    return () => clearTimeout(t)
  }, [phase, a.steps.length])

  const total = a.picked.price + addons.reduce((sum, s) => sum + s.price, 0)

  const resume = (items) => {
    setAddons(items)
    setResolved(true)
    setPhase('running')
  }

  const steps = DISPLAY_STEPS.map(({ label, ids }) => {
    const idx = ids.map((id) => a.steps.findIndex((s) => s.id === id))
    const last = a.steps[idx[idx.length - 1]]
    if (idx.every((i) => i < done)) return { label: label(mall.source), status: 'done', detail: last.done }
    if (idx.includes(done)) {
      if (phase === 'stopped') return { label: label(mall.source), status: 'paused', detail: '최소 주문 금액이 안 돼서 멈췄어요' }
      return {
        label: label(mall.source),
        status: 'active',
        detail: ids.includes('pay') ? '사장님 결제를 기다리고 있어요' : '진행하고 있어요',
      }
    }
    return { label: label(mall.source), status: 'pending' }
  })

  if (phase === 'done') return <Done a={a} mall={mall} total={total} addons={addons} />

  if (phase === 'stopped') return <Stopped a={a} mall={mall} steps={steps} onResume={resume} />

  return (
    <Screen title={`${mall.source} 주문 진행`}>
      <Eyebrow>
        {a.item} · {mall.source}
      </Eyebrow>
      <H1>{`AI가 ${mall.source}에서\n주문하고 있어요`}</H1>
      <Card tone="line">
        <AgentSteps steps={steps} label={`${mall.source} 주문 진행 단계`} />
      </Card>
      <Card>
        <KV label="AI 추천가" value={`${won(a.recommendPrice)}원`} />
        <KV label={`${mall.source} 현재가`} value={`${won(a.picked.price)}원`} />
        <KV label="차이" value={`${won(a.picked.price - a.recommendPrice, true)}원`} tone="deep" />
      </Card>
      <Button variant="outline" onClick={() => navigate('/orders/recommendation')}>
        주문 멈추기
      </Button>
      <P small>11.23 실제 쿠팡 테스트 화면을 바탕으로 한 예시예요.</P>

      <ApproveModal
        open={phase === 'approve' || phase === 'paying'}
        a={a}
        mall={mall}
        total={total}
        addons={addons}
        paying={phase === 'paying'}
        onPay={() => setPhase('paying')}
        onCancel={() => navigate('/orders/recommendation')}
      />
    </Screen>
  )
}

/** 24-8 AI 확인 필요 — 화면을 벗어나지 않고 멈춘 이유와 다음 행동을 바로 보여 준다 */
function Stopped({ a, mall, steps, onResume }) {
  const [sheetOpen, setSheetOpen] = useState(false)
  const [checked, setChecked] = useState([]) // 🚨 추천 품목은 미리 체크하지 않는다
  const picked = a.stop.suggestions.filter((s) => checked.includes(s.id))
  const added = picked.reduce((sum, s) => sum + s.price, 0)
  const left = Math.max(0, a.stop.short - added)

  const toggle = (id) => setChecked((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]))

  return (
    <Screen title="확인 필요">
      <div className="flex items-center gap-2">
        <Badge status="stopped">멈춤</Badge>
        <Eyebrow tone="amber">{mall.source} · 주문서 작성 중</Eyebrow>
      </div>
      <Card tone="line">
        <EmptyState
          kind="locked"
          compact
          title={a.stop.title}
          description={a.stop.message}
          progress={{ value: a.stop.cart, max: a.stop.threshold, unit: '원', label: '로켓배송 최소 금액까지' }}
        />
      </Card>
      <Button onClick={() => setSheetOpen(true)}>같이 담을 품목 고르기</Button>
      <Button variant="outline" onClick={() => onResume([])}>
        추가 없이 주문 (배송비 확인)
      </Button>
      <Button variant="secondary" to="/orders/recommendation/compare?item=cup">
        다른 판매처 보기
      </Button>
      <Card tone="line">
        <AgentSteps steps={steps} stagger={0} label={`${mall.source} 주문 진행 단계`} />
      </Card>

      <Sheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        title="같이 담을 품목을 골라 주세요"
        description={`${won(a.stop.short)}원어치를 더 담으면 로켓배송으로 주문할 수 있어요.`}
        footer={
          // '추가 없이 주문' 도 같은 크기 — 고르지 않을 자유를 똑같이 보여 준다
          <div className="grid w-full grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => onResume([])}
              className="h-[52px] rounded-button border border-line bg-white text-base font-bold text-ink"
            >
              추가 없이 주문
            </button>
            <button
              type="button"
              disabled={picked.length === 0}
              onClick={() => onResume(picked)}
              className="h-[52px] rounded-button bg-woori-deep text-base font-bold text-white disabled:opacity-50"
            >
              {picked.length > 0 ? `${picked.length}개 담고 주문` : '담고 주문'}
            </button>
          </div>
        }
      >
        <div className="flex flex-col">
          {a.stop.suggestions.map((s, i) => (
            <div key={s.id}>
              {i > 0 && <Divider />}
              <label className="flex min-h-[60px] cursor-pointer items-center gap-3 py-2">
                <input
                  type="checkbox"
                  checked={checked.includes(s.id)}
                  onChange={() => toggle(s.id)}
                  className="size-5 shrink-0 accent-woori-deep"
                />
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="text-body font-bold text-ink">{s.name}</span>
                  <span className="text-caption text-ink-sub">{s.note}</span>
                </span>
                <span className="num ml-auto text-body font-bold text-woori-deep">+{won(s.price)}원</span>
              </label>
            </div>
          ))}
        </div>
        <p className="mt-3 rounded-input bg-surface-muted px-4 py-3 text-label text-ink-sub" aria-live="polite">
          {picked.length === 0
            ? '아직 고른 품목이 없어요.'
            : left > 0
              ? `${won(left)}원 더 담아야 해요.`
              : `최소 금액을 채웠어요. 총 ${won(a.stop.cart + added)}원이에요.`}
        </p>
      </Sheet>
    </Screen>
  )
}

/** 24-9 결제 승인 — 돈이 나가는 확정이라 Modal. 결제 비밀번호는 쇼핑몰 결제 화면에서 사장님이 직접 입력 */
function ApproveModal({ open, a, mall, total, addons, paying, onPay, onCancel }) {
  return (
    <Modal
      open={open}
      onOpenChange={(next) => !next && onCancel()}
      title={paying ? `${mall.source}에서 결제를 기다리고 있어요` : '주문서를 다 채웠어요'}
      description={
        paying
          ? `${mall.source} 결제 화면에서 결제 비밀번호를 입력해 주세요. 결제가 끝나면 주문번호를 자동으로 확인해요.`
          : `결제만 해 주세요. ${mall.source} 결제 화면이 열리면 결제 비밀번호를 직접 입력해요.`
      }
      confirmLabel={`${mall.source} 결제 화면 열기`}
      confirmLoading={paying}
      confirmLoadingText="결제 확인 중"
      onConfirm={onPay}
    >
      {/* 배송비를 포함한 총액을 가장 크게 */}
      <div className="flex flex-col gap-0.5 rounded-input bg-woori-tint p-4">
        <span className="text-label text-ink-sub">결제 금액 (배송비 포함)</span>
        <span className="num text-display font-bold text-woori-deep">{won(total)}원</span>
      </div>
      <div className="flex flex-col gap-2">
        <KV label="상품" value={a.picked.name} />
        {addons.map((s) => (
          <KV key={s.id} label="함께 담은 품목" value={s.name} />
        ))}
        <KV label="배송" value={`로켓배송 · ${a.arrive}`} />
        <KV label="배송지" value={a.shipTo} />
      </div>
    </Modal>
  )
}

/** 24-10 주문 완료 */
function Done({ a, mall, total, addons }) {
  return (
    <Screen title="주문 완료">
      <div className="flex justify-center pt-2">
        <DoneCheck size={64} />
      </div>
      <h2 className="text-center whitespace-pre-line text-h1 font-bold text-ink">{`${mall.source} 주문을\n마쳤어요`}</h2>
      <Card>
        <KV label="주문번호" value={`${mall.source} 주문번호 (자동 확인)`} />
        <KV label="상품" value={addons.length > 0 ? `${a.picked.name} 외 ${addons.length}건` : a.picked.name} />
        <KV label="결제" value={`${won(total)}원`} tone="deep" />
        <KV label="도착 예정" value={a.arrive} />
        <KV label="지출 장부" value="자동 기록됨" />
      </Card>
      <Card tone="line">
        <p className="text-body font-bold text-ink">앱에 반영된 것</p>
        <P tone="ink">· 발주 상태 → 주문 완료</P>
        <P tone="ink">· 입고 예정 11.24 추가</P>
        <P tone="ink">· 다음 발주 추천에 {mall.source} 가격 반영</P>
      </Card>
      <Button to="/orders">발주 목록 보기</Button>
      <Button variant="outline" to="/orders/o1">
        주문 취소 요청
      </Button>
      <P small>취소·반품도 AI가 {mall.source} 주문 내역에서 대신 접수하고, 환불되면 장부에 반영해요.</P>
    </Screen>
  )
}
