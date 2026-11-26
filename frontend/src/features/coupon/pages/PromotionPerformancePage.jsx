import { useState } from 'react'
import { Screen } from '@/components/common/layout'
import { BarChart, Card, Chips, H2, HeadRow, KV, ListRow, P, Pill } from '@/components/common/ui'
import { won } from '@/lib/format'
import { formatCalendarDate } from '@/utils/format'
import { useCouponDraft } from '@/features/coupon/useCouponDraft'
import { useEndPromotion, usePromotions } from '@/features/coupon/queries'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { Modal } from '@/components/ui/modal'
import { EmptyState } from '@/components/ui/empty-state'
import { SkeletonCard } from '@/components/ui/loading'
import { toast } from '@/components/ui/toast'
import SalesTabs from '@/features/sales/components/SalesTabs'

// ⚠️ 가정: 운영을 종료하면 오늘 이 시각부터 POS에서 내린다 (POS 반영 시각은 백엔드와 맞출 것)
const POS_OFF_TIME = '18:00'

const TABS = [
  { value: 'running', label: '진행 중' },
  { value: 'ended', label: '종료' },
]

const periodText = (p) => `${formatCalendarDate(p.startDate)} – ${formatCalendarDate(p.endDate)}`

/** 44 프로모션 성과 (UF-08) — 진행 중 · 종료 목록, 진행 중인 프로모션 운영 종료 */
export default function PromotionPerformancePage({ embedded = false }) {
  const draftName = useCouponDraft((s) => s.promotionName)
  const { data: promotions = [], isPending } = usePromotions()
  const endMutation = useEndPromotion()
  const [tab, setTab] = useState('running')
  const [confirm, setConfirm] = useState(null) // 종료 확인 창에 띄울 프로모션

  // 라떼 세트는 조건 수정 화면에서 바꾼 이름을 쓴다
  const nameOf = (p) => (p.id === 'latte-set' ? draftName : p.name)
  const list = promotions.filter((p) => p.status === tab)

  const end = () => {
    endMutation.mutate(confirm.id, {
      onSuccess: () => {
        setConfirm(null)
        setTab('ended')
        toast('운영을 종료했어요')
      },
      onError: (err) => toast(err.message, { tone: 'error' }),
    })
  }

  const content = (
    <>
      <SegmentedControl
        label="프로모션 상태"
        value={tab}
        onChange={setTab}
        items={TABS.map((t) => ({ ...t, label: `${t.label} ${promotions.filter((p) => p.status === t.value).length}` }))}
      />

      {isPending ? (
        <SkeletonCard lines={4} />
      ) : list.length === 0 ? (
        <EmptyState
          kind={tab === 'running' ? 'first' : 'no-filter'}
          compact
          title={tab === 'running' ? '운영 중인 프로모션이 없어요' : '종료한 프로모션이 없어요'}
          description={tab === 'running' ? 'AI가 프로모션을 추천하면 홈 브리핑에서 알려 드려요.' : undefined}
        />
      ) : (
        list.map((p) =>
          tab === 'running' ? (
            <RunningCard key={p.id} p={p} name={nameOf(p)} onEnd={() => setConfirm(p)} />
          ) : (
            <EndedCard key={p.id} p={p} name={nameOf(p)} />
          ),
        )
      )}

      {tab === 'running' && list.some((p) => p.id === 'latte-set') && <LatteEffect />}

      {/* 운영 종료 확인 — POS에서 내리는 건 되돌리기 어려워서 확인 창으로 받는다 (취소 · 종료하기 같은 크기) */}
      <Modal
        open={!!confirm}
        onOpenChange={(open) => !open && setConfirm(null)}
        title={confirm ? `${nameOf(confirm)} 운영을 종료할까요?` : ''}
        description={confirm ? `오늘 ${POS_OFF_TIME}부터 POS에서 내려요. 이미 쓴 ${confirm.used}건은 그대로 집계돼요.` : ''}
        confirmLabel="종료하기"
        confirmLoading={endMutation.isPending}
        confirmLoadingText="종료하고 있어요"
        onConfirm={end}
        tone="danger"
      />
    </>
  )

  if (embedded) return content
  return (
    <Screen title="매출" back={false} tab wide>
      <SalesTabs />
      {content}
    </Screen>
  )
}

function RunningCard({ p, name, onEnd }) {
  return (
    <Card>
      <HeadRow title={name} size="text-base">
        <Pill tone="ok">POS 반영 완료</Pill>
      </HeadRow>
      <KV label="승인" value={p.approvedAt} />
      <KV label="운영 기간" value={periodText(p)} />
      <KV label="사용 건수" value={`${p.used}건`} />
      <KV label={`사용률 (사용 한도 ${p.limit}장 기준)`} value={`${Math.round((p.used / p.limit) * 100)}%`} tone="deep" />
      <div className="flex items-center gap-2">
        <span className="text-label text-ink-sub">발행량</span>
        <span className="ml-auto">
          <Pill tone="amber">확인 불가 · POS 미제공</Pill>
        </span>
      </div>
      <KV label="누적 할인액" value={`${won(p.discount)}원`} />
      <KV label="프로모션 적용 매출" value={`${won(p.sales)}원`} />
      <P tone="mute" small>
        최근 수집 {p.lastSync}
      </P>
      <button
        type="button"
        onClick={onEnd}
        className="mt-1 h-11 w-full rounded-button border border-danger/30 bg-white text-label font-bold text-danger hover:bg-danger-bg"
      >
        운영 종료
      </button>
    </Card>
  )
}

function EndedCard({ p, name }) {
  return (
    <Card tone="line">
      <HeadRow title={name} size="text-base">
        <Pill tone="gray">{p.endedBy === 'owner' ? '사장님이 종료' : '기간 만료'}</Pill>
      </HeadRow>
      <KV label="운영 기간" value={periodText(p)} />
      <KV label="사용 건수" value={`${p.used}건 · 한도 ${p.limit}장`} />
      <KV label="누적 할인액" value={`${won(p.discount)}원`} />
      <KV label="프로모션 적용 매출" value={`${won(p.sales)}원`} tone="deep" />
      <P tone="mute" small>
        최근 수집 {p.lastSync}
      </P>
    </Card>
  )
}

/** 라떼 세트 효과 비교 · 사용 내역 (목업 예시) */
function LatteEffect() {
  return (
    <>
      <Card tone="line">
        <H2>효과 비교</H2>
        <Chips items={['운영 기간 vs 직전 2주', '지난주 같은 요일']} />
        <BarChart values={[9, 14]} highlight={1} labels={['직전 2주', '운영 기간']} />
        <KV label="평일 오후 주문" value="하루 9건 → 14건" tone="deep" />
        <KV label="바닐라 라떼 판매" value="24% ↑" tone="deep" />
        <KV label="추천 때 예상" value="하루 +6건" />
        <P tone="mute" small>
          관측된 변화예요. 날씨 등 다른 요인도 있어서 전부 프로모션 효과라고 보긴 어려워요.
        </P>
      </Card>
      <Card tone="line" gap="gap-0" pad="px-4 py-1">
        <ListRow title="11.20 14:32 · 주문 #2041" value="사용" />
        <ListRow title="11.20 15:10 · 주문 #2057" value="사용" />
        <ListRow title="11.20 16:05 · 주문 #2063" value="취소" />
      </Card>
    </>
  )
}
