import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ThumbsDown, ThumbsUp, X } from 'lucide-react'
import { Screen } from '@/components/common/layout'
import { Button, ButtonRow, Card, Divider, Eyebrow, H1, H2, HeadRow, KV, P, Pill } from '@/components/common/ui'
import { won } from '@/lib/format'
import { channelOf, eulReul, shortName } from '@/features/purchase/channels'
import PriceCompareCard from '@/features/purchase/components/PriceCompareCard'
import SwipeToRemove from '@/features/purchase/components/SwipeToRemove'
import { useOrderRecommendation } from '@/features/purchase/queries'
import { toast } from '@/components/ui/toast'
import { Tooltip } from '@/components/ui/tooltip'
import { ButtonLoading } from '@/components/ui/loading'
import { Sheet, SheetRadioList } from '@/components/ui/sheet'
import { EmptyState } from '@/components/ui/empty-state'

// 18-1 반려 사유 화면과 같은 목록
const REJECT_REASONS = ['지금은 필요 없어요', '금액이 부담돼요', '시기가 안 맞아요', '직접 처리할게요', '추천이 틀렸어요', '기타']

// 목업의 배송비는 '3,000원' 같은 문자열이라 숫자로 바꾼다 (API 가 생기면 숫자로 받는다)
const toNumber = (v) => (typeof v === 'number' ? v : Number(String(v).replace(/[^\d]/g, '')) || 0)

/** 24 발주 추천 (UF-12) — 품목마다 "앱에서 전송" 인지 "쿠팡에서 직접 주문" 인지 보여준다 */
export default function OrderRecommendationPage() {
  const { data: r } = useOrderRecommendation()
  const navigate = useNavigate()
  const [removed, setRemoved] = useState([]) // 사장님이 뺀 품목 id
  const [sending, setSending] = useState(false)
  const [rejectOpen, setRejectOpen] = useState(false)
  const [reason, setReason] = useState(null) // 미리 고르지 않는다
  const [feedback, setFeedback] = useState(null) // 'up' | 'down'
  const { hash } = useLocation()

  // 홈 배너의 [근거 보기] (#basis) 로 들어오면 산출 근거로 바로 내려간다
  useEffect(() => {
    if (hash === '#basis') document.getElementById('basis')?.scrollIntoView({ block: 'start', behavior: 'smooth' })
  }, [hash])

  const items = r.items.filter((it) => !removed.includes(it.id))
  const linkItems = items.filter((it) => channelOf(it).kind === 'link')
  const subtotal = items.reduce((sum, it) => sum + it.price, 0)
  const shipping = items.length > 0 ? toNumber(r.shipping) : 0
  const total = subtotal + shipping

  // 되돌릴 수 있는 일 → [되돌리기] 가 붙은 토스트 (앱 스낵바 / 웹 오른쪽 위)
  const remove = (it) => {
    setRemoved((ids) => [...ids, it.id])
    toast(`${eulReul(shortName(it.product))} 뺐어요`, {
      undo: () => setRemoved((ids) => ids.filter((id) => id !== it.id)),
    })
  }

  // TODO API 가 생기면 useMutation 으로 바꾼다 (POST …/purchase-orders/{id}/approve)
  const approve = () => {
    setSending(true)
    setTimeout(() => {
      toast(`${items.length}개 품목 발주를 보냈어요`)
      navigate('/orders/o1')
    }, 900)
  }

  const reject = () => {
    setRejectOpen(false)
    toast('발주 추천을 반려했어요')
    navigate('/orders')
  }

  const sendFeedback = (v) => {
    setFeedback(v)
    toast('의견을 남겼어요. 다음 추천에 반영할게요')
  }

  return (
    <Screen title="발주 추천">
      <Eyebrow>AI 추천 · 승인 대기</Eyebrow>
      <H1>{items.length > 0 ? `${items.length}개 품목을\n발주할까요?` : '발주할 품목이 없어요'}</H1>

      {items.length === 0 ? (
        <EmptyState
          kind="no-filter"
          title="모든 품목을 뺐어요"
          description="필요하면 아래 알림에서 되돌릴 수 있어요."
          compact
        />
      ) : (
        <Card tone="line">
          <P small tone="mute">
            <span className="lg:hidden">빼고 싶은 품목은 왼쪽으로 밀거나 ✕ 를 눌러요.</span>
            <span className="hidden lg:inline">빼고 싶은 품목은 ✕ 를 눌러요.</span>
          </P>
          {items.map((it, i) => {
            const ch = channelOf(it)
            return (
              <div key={it.id} className="flex flex-col gap-2.5">
                {i > 0 && <Divider />}
                <SwipeToRemove onRemove={() => remove(it)}>
                  <div className="flex items-center gap-2 py-1">
                    <div className="flex flex-col gap-1">
                      <span className="text-body font-bold text-ink">
                        {it.product} × {it.qty.toLocaleString('ko-KR')}
                      </span>
                      <span className="text-[13px] text-ink-sub">
                        {it.supplier} · {it.arrive} 도착
                      </span>
                      <span>
                        {ch.kind === 'api' ? (
                          <Pill tone="ok">앱에서 바로 전송</Pill>
                        ) : (
                          <Pill tone="amber">{ch.label}에서 직접 주문</Pill>
                        )}
                      </span>
                    </div>
                    <span className="num ml-auto self-start text-body font-bold text-ink">{won(it.price)}원</span>
                    <button
                      type="button"
                      aria-label={`${it.product} 빼기`}
                      onClick={() => remove(it)}
                      className="-mr-1 self-start rounded-md p-1.5 text-ink-mute hover:bg-surface-muted hover:text-ink"
                    >
                      <X size={18} />
                    </button>
                  </div>
                </SwipeToRemove>
              </div>
            )
          })}
        </Card>
      )}

      {linkItems.map((it) => (
        <PriceCompareCard key={it.id} itemId={it.id} />
      ))}

      {/* 배송비를 포함한 총비용을 가장 크게 */}
      <Card>
        <p className="text-label text-ink-sub">배송비 포함 총액</p>
        <p className="num text-display font-bold text-woori-deep">{won(total)}원</p>
        <Divider />
        <KV label="품목 금액" value={`${won(subtotal)}원`} />
        <KV label="배송비" value={`${won(shipping)}원`} />
      </Card>

      {linkItems.length > 0 && (
        <Card tone="amber">
          <HeadRow title={`${linkItems.length}개 품목은 AI가 대신 주문해요`} size="text-base">
            <Pill tone="amberWhite">결제만 직접</Pill>
          </HeadRow>
          <P tone="ink">
            {linkItems.map((it) => `${it.product}(${channelOf(it).source ?? channelOf(it).label})`).join(', ')}
            {'은 앱 연동(API)이 안 되는 곳이에요. 승인하면 AI가 사장님 계정으로 주문서까지 채우고, 결제만 사장님이 해요.'}
          </P>
          <Button variant="outline" to="/orders/agent">
            AI가 {channelOf(linkItems[0]).source ?? channelOf(linkItems[0]).label}에서 대신 주문
          </Button>
        </Card>
      )}

      <div id="basis" className="scroll-mt-24">
      <Card className={hash === '#basis' ? 'ring-2 ring-inset ring-woori-blue' : undefined}>
        <div className="flex items-center gap-1">
          <H2>산출 근거</H2>
          <Tooltip label="발주 수량 계산 방법">
            발주 수량 = 다음 입고까지 예상 소모량 + 안전 재고 − 현재 재고 − 입고 예정량. 날씨 · 요일별 판매량으로 예상 소모량을
            보정해요.
          </Tooltip>
        </div>
        <P tone="ink">
          금·월 비 예보로 우유를 18% 넉넉히 잡았어요. 컵은 쿠팡이 총비용이 더 낮아 쿠팡을 추천했어요.
        </P>
      </Card>
      </div>

      {/* 👍👎 추천 피드백 */}
      <div className="flex items-center gap-2">
        <span className="text-label text-ink-sub">이번 추천이 도움이 됐나요?</span>
        <div className="ml-auto flex gap-1.5">
          {[
            ['up', ThumbsUp, '도움이 됐어요'],
            ['down', ThumbsDown, '도움이 안 됐어요'],
          ].map(([v, Icon, label]) => (
            <button
              key={v}
              type="button"
              aria-label={label}
              aria-pressed={feedback === v}
              onClick={() => sendFeedback(v)}
              className={`flex size-10 items-center justify-center rounded-full border transition-colors ${
                feedback === v ? 'border-woori-deep bg-woori-tint text-woori-deep' : 'border-line text-ink-sub hover:bg-surface-muted'
              }`}
            >
              <Icon size={18} />
            </button>
          ))}
        </div>
      </div>

      <Button variant="outline" to="/orders/recommendation/edit">
        조건 수정
      </Button>
      <ButtonLoading loading={sending} loadingText="발주를 보내고 있어요" disabled={items.length === 0} onClick={approve}>
        제안대로 할게요 (승인)
      </ButtonLoading>
      <ButtonRow>
        <Button variant="secondary" to="/on-hold">
          보류
        </Button>
        <Button variant="secondary" onClick={() => setRejectOpen(true)}>
          반려
        </Button>
      </ButtonRow>

      <Sheet
        open={rejectOpen}
        onOpenChange={setRejectOpen}
        title="반려하는 이유를 알려주세요"
        description="다음 추천에 반영해요. 비슷한 제안은 7일간 덜 보여 드려요."
        footer={
          <>
            <Button variant="outline" onClick={() => setRejectOpen(false)}>
              취소
            </Button>
            <ButtonLoading disabled={!reason} onClick={reject}>
              반려하기
            </ButtonLoading>
          </>
        }
      >
        <SheetRadioList name="reject-reason" options={REJECT_REASONS} value={reason} onChange={setReason} />
      </Sheet>
    </Screen>
  )
}
