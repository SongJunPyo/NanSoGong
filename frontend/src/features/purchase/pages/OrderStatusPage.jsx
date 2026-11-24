import { useState } from 'react'
import { Screen } from '@/components/common/layout'
import { Button, Card, Eyebrow, H1, HeadRow, KV, P, Stepper } from '@/components/common/ui'
import { won } from '@/lib/format'
import { channelOf, directOrderPath, eunNeun } from '@/features/purchase/channels'
import ExternalOrderSheet from '@/features/purchase/components/ExternalOrderSheet'
import { useOrderRecommendation } from '@/features/purchase/queries'
import { Badge } from '@/components/ui/badge'
import { Modal } from '@/components/ui/modal'
import { toast } from '@/components/ui/toast'

const ORDER_ID = 'o1'

/** 26 발주 상태 — 전송 결과 · 예외 · 외부 주문 (UF-13) */
export default function OrderStatusPage() {
  const { data: r } = useOrderRecommendation()
  const cup = r.items.find((it) => channelOf(it).kind === 'link')
  const [sheetOpen, setSheetOpen] = useState(false)
  const [reapproveOpen, setReapproveOpen] = useState(false)
  const [reapproving, setReapproving] = useState(false)
  const [reapproved, setReapproved] = useState(false)

  // 바뀐 조건으로 다시 승인 — 돈이 더 나가는 확정이라 Modal
  // TODO API 가 생기면 useMutation 으로 바꾼다 (POST …/purchase-orders/o2/reapprove)
  const reapprove = () => {
    setReapproving(true)
    setTimeout(() => {
      setReapproving(false)
      setReapproveOpen(false)
      setReapproved(true)
      toast('원두 발주를 바뀐 조건으로 보냈어요')
    }, 800)
  }
  return (
    <Screen title="발주 상세">
      <Eyebrow>11.19 승인 · 3개 품목</Eyebrow>
      <H1>발주 진행 상황</H1>
      <Card>
        <HeadRow title="우유 1L × 10" size="text-base">
          <Badge>배송 중</Badge>
        </HeadRow>
        <Stepper steps={['접수', '배송', '부분 입고', '확인 필요', '입고 완료']} current={1} />
        <KV label="○○유통 · 앱에서 전송" value="성공 · 11.19 15:40" />
      </Card>
      {reapproved ? (
        <Card>
          <HeadRow title="원두 1kg × 2" size="text-base">
            <Badge>진행 중</Badge>
          </HeadRow>
          <KV label="△△로스터리 · 앱에서 전송" value="63,000원 · 11.22 도착" />
        </Card>
      ) : (
        <Card tone="amber">
          <HeadRow title="원두 1kg × 2" size="text-base">
            <Badge>재승인 대기</Badge>
          </HeadRow>
          <P tone="ink">승인 뒤 단가가 바뀌어서 아직 보내지 않았어요. 바뀐 조건을 확인하고 다시 승인해 주세요.</P>
          <Button variant="outline" onClick={() => setReapproveOpen(true)}>
            재승인하기
          </Button>
          <Button variant="text" to="/reapproval/o2">
            바뀐 이유 자세히 보기 ›
          </Button>
        </Card>
      )}
      {cup && (
        <Card tone="line">
          <HeadRow title={`${cup.product} × ${cup.qty}`} size="text-base">
            <Badge>{`${channelOf(cup).label} 주문 필요`}</Badge>
          </HeadRow>
          <P tone="ink">
            {eunNeun(channelOf(cup).label)} 앱에서 대신 주문할 수 없어요. 검색 화면을 열어드릴게요. 주문하고 돌아오면
            내역만 등록하면 돼요.
          </P>
          <KV label="주문 조건" value={`${cup.qty}개 · 예상 ${won(cup.price)}원`} />
          <Button onClick={() => setSheetOpen(true)}>{channelOf(cup).label}에서 주문하기</Button>
          <Button variant="outline" to={directOrderPath(ORDER_ID, cup)}>
            이미 주문했어요 · 내역 등록
          </Button>
        </Card>
      )}
      <Button variant="outline" to="/receiving">
        입고 확인하기
      </Button>
      <Modal
        open={reapproveOpen}
        onOpenChange={setReapproveOpen}
        title="바뀐 조건으로 다시 승인할까요?"
        description="승인하면 △△로스터리에 바로 보내요."
        confirmLabel="다시 승인"
        confirmLoading={reapproving}
        confirmLoadingText="보내고 있어요"
        onConfirm={reapprove}
      >
        <div className="flex flex-col gap-0.5 rounded-input bg-woori-tint p-4">
          <span className="text-label text-ink-sub">바뀐 총액 (배송비 포함)</span>
          <span className="num text-display font-bold text-woori-deep">63,000원</span>
          <span className="text-caption text-ink-sub">기존 58,000원 · 5,000원 늘었어요</span>
        </div>
        <div className="flex flex-col gap-2">
          <KV label="단가" value="29,000 → 31,500원" tone="warn" />
          <KV label="도착 예정" value="11.21 → 11.22" tone="warn" />
        </div>
      </Modal>
      {cup && <ExternalOrderSheet open={sheetOpen} onClose={() => setSheetOpen(false)} orderId={ORDER_ID} item={cup} />}
    </Screen>
  )
}
