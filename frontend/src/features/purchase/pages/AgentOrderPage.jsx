import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Check } from 'lucide-react'
import { Screen } from '@/components/common/layout'
import { Button, Card, Divider, Eyebrow, H1, H2, KV, P } from '@/components/common/ui'
import { won } from '@/lib/format'
import { CHANNELS } from '@/features/purchase/channels'
import { useAgentOrder } from '@/features/purchase/queries'

const TICK = 900 // 목업에서 단계 하나가 끝나는 시간 (ms)

/**
 * 24-7 ~ 24-10 AI 대신 주문 (UF-13 2C)
 *
 * running  : AI가 쇼핑몰에서 검색 → 최저가 고르기 → 장바구니 → 주문서 작성
 * stopped  : 멈춤 조건에 걸림 (예: 로켓배송 최소 금액) → 사장님 선택을 기다린다 (24-8)
 * approve  : 주문서 완성 → 결제 승인 시트 (24-9). 결제 비밀번호는 사장님이 쇼핑몰에서 직접 입력
 * done     : 주문번호 확인 · 장부 기록 (24-10)
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

  const [done, setDone] = useState(0) // 끝난 단계 수
  const [phase, setPhase] = useState('running')
  const [addon, setAddon] = useState(null) // 최소 금액을 채우려고 같이 담은 품목
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

  const total = a.picked.price + (addon?.price ?? 0)

  const choose = (item) => {
    setAddon(item)
    setResolved(true)
    setPhase('running')
  }

  if (phase === 'done') return <Done a={a} mall={mall} total={total} addon={addon} />

  if (phase === 'stopped')
    return (
      <Screen title="확인 필요">
        <Eyebrow tone="amber">{mall.source} · 주문서 작성 중</Eyebrow>
        <H1>{a.stop.title}</H1>
        <Card tone="amber">
          <KV label="장바구니" value={`${won(a.stop.cart)}원`} />
          <KV label="로켓배송 무료 기준" value={`${won(a.stop.threshold)}원`} />
          <KV label="모자란 금액" value={`${won(a.stop.short)}원`} tone="deep" />
          <P tone="ink">{a.stop.message}</P>
        </Card>
        <Card tone="line">
          <p className="text-body font-bold text-ink">같이 담으면 좋은 품목</p>
          {a.stop.suggestions.map((s, i) => (
            <div key={s.id} className="flex flex-col gap-2.5">
              {i > 0 && <Divider />}
              <button type="button" onClick={() => choose(s)} className="flex items-center gap-2 text-left">
                <span className="flex flex-col gap-0.5">
                  <span className="text-[14px] font-bold text-ink">{s.name}</span>
                  <span className="text-caption text-ink-sub">{s.note}</span>
                </span>
                <span className="num ml-auto text-[14px] font-bold text-woori-deep">+{won(s.price)}원</span>
              </button>
            </div>
          ))}
        </Card>
        <Button onClick={() => choose(a.stop.suggestions[0])}>{a.stop.suggestions[0].name} 같이 담기</Button>
        <Button variant="outline" onClick={() => choose(null)}>
          추가 없이 주문 (배송비 확인)
        </Button>
        <Button variant="secondary" to="/orders/recommendation/compare?item=cup">
          다른 판매처 보기
        </Button>
      </Screen>
    )

  return (
    <Screen title={`${mall.source} 주문 진행`}>
      <Eyebrow>
        {a.item} · {mall.source}
      </Eyebrow>
      <H1>{`AI가 ${mall.source}에서\n주문하고 있어요`}</H1>
      <Card tone="line" gap="gap-3.5">
        {a.steps.map((s, i) => {
          const state = i < done ? 'done' : i === done ? 'now' : 'todo'
          return (
            <div key={s.id} className="flex items-start gap-3">
              <span
                className={`mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full text-[12px] font-bold ${
                  state === 'done'
                    ? 'bg-woori-deep text-white'
                    : state === 'now'
                      ? 'animate-pulse bg-warning-bg text-warning'
                      : 'bg-woori-tint text-ink-sub'
                }`}
              >
                {state === 'done' ? <Check size={14} strokeWidth={3} /> : i + 1}
              </span>
              <span className="flex flex-col gap-0.5">
                <span className={`text-body font-bold ${state === 'todo' ? 'text-ink-mute' : 'text-ink'}`}>
                  {s.label}
                </span>
                {state === 'done' && <span className="text-[13px] text-ink-sub">{s.done}</span>}
                {state === 'now' && <span className="text-[13px] text-warning">진행 중…</span>}
              </span>
            </div>
          )
        })}
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

      {(phase === 'approve' || phase === 'paying') && (
        <ApproveSheet
          a={a}
          mall={mall}
          total={total}
          addon={addon}
          paying={phase === 'paying'}
          onPay={() => setPhase('paying')}
          onCancel={() => navigate('/orders/recommendation')}
        />
      )}
    </Screen>
  )
}

/** 24-9 결제 승인 시트 — 결제 비밀번호는 쇼핑몰 결제 화면에서 사장님이 직접 입력 */
function ApproveSheet({ a, mall, total, addon, paying, onPay, onCancel }) {
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="결제 승인"
        className="flex w-full max-w-[430px] flex-col gap-4 rounded-t-[24px] bg-white px-screen pt-5 pb-8"
      >
        <H2>{paying ? `${mall.source}에서 결제를 기다리고 있어요` : '주문서를 다 채웠어요'}</H2>
        <P>
          {paying
            ? `${mall.source} 결제 화면에서 결제 비밀번호를 입력해 주세요. 결제가 끝나면 주문번호를 자동으로 확인해요.`
            : `결제만 해 주세요. ${mall.source} 결제 화면이 열리면 결제 비밀번호를 직접 입력해요.`}
        </P>
        <Card>
          <KV label="상품" value={a.picked.name} />
          {addon && <KV label="함께 담은 품목" value={addon.name} />}
          <KV label="배송" value={`로켓배송 · ${a.arrive}`} />
          <KV label="배송지" value={a.shipTo} />
          <KV label="결제 금액" value={`${won(total)}원`} tone="deep" />
        </Card>
        <Button onClick={onPay}>{paying ? '결제 확인 중…' : `${mall.source} 결제 화면 열기`}</Button>
        {!paying && (
          <Button variant="text" onClick={onCancel}>
            취소
          </Button>
        )}
      </div>
    </div>
  )
}

/** 24-10 주문 완료 */
function Done({ a, mall, total, addon }) {
  return (
    <Screen title="주문 완료">
      <div className="flex justify-center pt-2">
        <span className="flex size-14 items-center justify-center rounded-full bg-success-bg text-success">
          <Check size={28} strokeWidth={3} />
        </span>
      </div>
      <h2 className="text-center whitespace-pre-line text-h1 font-bold text-ink">{`${mall.source} 주문을\n마쳤어요`}</h2>
      <Card>
        <KV label="주문번호" value={`${mall.source} 주문번호 (자동 확인)`} />
        <KV label="상품" value={addon ? `${a.picked.name} 외 1건` : a.picked.name} />
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
