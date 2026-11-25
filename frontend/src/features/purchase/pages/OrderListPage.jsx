import { useState } from 'react'
import { Screen } from '@/components/common/layout'
import { Card, HeadRow, P, Pill } from '@/components/common/ui'
import { useOrders } from '@/features/purchase/queries'
import { EmptyState } from '@/components/ui/empty-state'

const TABS = [
  { id: 'progress', label: '진행 중' },
  { id: 'done', label: '완료' },
  { id: 'issue', label: '실패·확인 필요' },
]

/** 26-0 발주 목록 (UF-13 4) — 탭을 누르면 그 상태의 발주만 보여 준다 */
export default function OrderListPage() {
  const { data: orders } = useOrders()
  const [tab, setTab] = useState('progress')
  const count = (id) => orders.filter((o) => o.group === id).length
  const shown = orders.filter((o) => o.group === tab)

  return (
    <Screen title="발주 목록">
      <div role="tablist" aria-label="발주 상태" className="flex flex-wrap gap-2">
        {TABS.map((t) => {
          const on = tab === t.id
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => setTab(t.id)}
              className={`rounded-chip px-3.5 py-2 text-[13px] ${
                on ? 'bg-woori-deep font-bold text-white' : 'bg-surface-muted font-medium text-ink-sub'
              }`}
            >
              {t.label} <span className="num">{count(t.id)}</span>
            </button>
          )
        })}
      </div>
      {shown.length === 0 ? (
        <EmptyState
          kind={tab === 'issue' ? 'done' : 'no-filter'}
          compact
          title={tab === 'issue' ? '손볼 발주가 없어요' : '해당하는 발주가 없어요'}
        />
      ) : (
        shown.map((o) => (
          <Card key={o.id} tone="line" gap="gap-1.5" to={o.to}>
            <HeadRow title={o.title} size="text-base">
              <Pill tone={o.tone}>{o.status}</Pill>
            </HeadRow>
            <P small>{o.sub}</P>
          </Card>
        ))
      )}
    </Screen>
  )
}
