import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search, X } from 'lucide-react'
import { Screen } from '@/components/common/layout'
import { Pill } from '@/components/common/ui'
import StockBar from '@/features/inventory/components/StockBar'
import InventoryTabs from '@/features/inventory/components/InventoryTabs'
import PullToRefresh from '@/features/inventory/components/PullToRefresh'
import { useInventory } from '@/features/inventory/queries'
import { byUrgency, stockInfo, stockMessage } from '@/features/inventory/stock'
import { EmptyState } from '@/components/ui/empty-state'
import { toast } from '@/components/ui/toast'

const FILTERS = [
  { id: 'all', label: '전체' },
  { id: 'low', label: '부족' },
  { id: 'expiring', label: '임박' },
]
const STATE_PILL = { low: ['warn', '부족'], expiring: ['amber', '임박'], check: ['gray', '실사 필요'] }

/**
 * 21 재고 (UF-10) — 급한 것부터 한 줄씩
 *   카드: 이름 · 상태, 사람 말 한 줄("내일 떨어져요 · 4팩 남음"), 막대. 부족할 때만 [발주]
 *   숫자(ml · 적정 재고) · 입고분 · 실사 · 폐기 · 수정은 카드를 눌러 품목 상세에서
 */
export default function InventoryPage() {
  const { data: allItems, refetch } = useInventory()
  const [filter, setFilter] = useState('all')
  const [searching, setSearching] = useState(false)
  const [query, setQuery] = useState('')

  const items = allItems.map((i) => ({ ...i, info: stockInfo(i) })).sort(byUrgency)
  const count = (id) => (id === 'all' ? items.length : items.filter((i) => i.info.state === id).length)
  const shown = items.filter((i) => (filter === 'all' || i.info.state === filter) && i.name.includes(query.trim()))

  const refresh = async () => {
    await refetch()
    toast('재고를 새로 불러왔어요')
  }

  return (
    <Screen title="재고" back={false} tab wide>
      <InventoryTabs />
      <PullToRefresh onRefresh={refresh}>
        {/* 상태 칩 + 검색 (돋보기를 누르면 검색 칸) */}
        {searching ? (
          <div className="flex items-center gap-2">
            <input
              autoFocus
              aria-label="품목 검색"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="품목 이름"
              className="h-11 min-w-0 flex-1 rounded-input bg-surface-muted px-4 text-body text-ink outline-none placeholder:text-ink-mute focus:ring-2 focus:ring-woori-blue"
            />
            <button
              type="button"
              aria-label="검색 닫기"
              onClick={() => {
                setSearching(false)
                setQuery('')
              }}
              className="inline-flex size-11 items-center justify-center rounded-lg text-ink-sub hover:bg-surface-muted"
            >
              <X size={20} />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            <div role="group" aria-label="재고 상태" className="flex gap-1.5 overflow-x-auto">
              {FILTERS.map((f) => {
                const on = filter === f.id
                const n = count(f.id)
                return (
                  <button
                    key={f.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setFilter(f.id)}
                    className={`shrink-0 rounded-chip px-3.5 py-2 text-label ${
                      on ? 'bg-woori-deep font-bold text-white' : 'bg-surface-muted font-medium text-ink-sub'
                    }`}
                  >
                    {f.label} <span className={`num ${!on && f.id === 'low' && n ? 'font-bold text-danger' : ''}`}>{n}</span>
                  </button>
                )
              })}
            </div>
            <button
              type="button"
              aria-label="품목 검색"
              onClick={() => setSearching(true)}
              className="ml-auto inline-flex size-10 shrink-0 items-center justify-center rounded-lg text-ink-sub hover:bg-surface-muted"
            >
              <Search size={20} />
            </button>
          </div>
        )}

        {shown.length === 0 ? (
          query.trim() ? (
            <EmptyState kind="no-results" compact title={`'${query.trim()}' 품목이 없어요`} description="이름을 다시 확인해 주세요." />
          ) : (
            <EmptyState kind="done" compact title="여기에 해당하는 품목이 없어요" />
          )
        ) : (
          <ul className="grid gap-2.5 md:grid-cols-2">
            {shown.map((i) => (
              <li key={i.id}>
                <ItemCard item={i} />
              </li>
            ))}
          </ul>
        )}

        <Link
          to="/inventory/items/new/edit"
          className="inline-flex min-h-11 items-center justify-center gap-1 rounded-input border border-line text-label font-bold text-ink hover:bg-surface-muted"
        >
          <Plus size={16} aria-hidden="true" />
          품목 추가
        </Link>
      </PullToRefresh>
    </Screen>
  )
}

/** 카드 전체가 상세로 가는 링크 (이름 링크를 카드 크기로 넓힘). [발주] 만 따로 눌린다 */
function ItemCard({ item }) {
  const { info } = item
  const low = info.state === 'low'
  const pill = STATE_PILL[info.state]

  return (
    <div
      className={`relative flex flex-col gap-2 rounded-input border bg-white p-4 transition-colors hover:bg-surface-muted/60 ${
        low ? 'border-danger/30' : 'border-line'
      }`}
    >
      <div className="flex items-center gap-2">
        <Link
          to={`/inventory/items/${item.id}`}
          className="min-w-0 flex-1 text-body font-bold text-ink after:absolute after:inset-0 after:rounded-input focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-woori-blue"
        >
          {item.name}
        </Link>
        {pill ? (
          <Pill tone={pill[0]}>{pill[1]}</Pill>
        ) : (
          info.daysLeft != null && <span className="num text-caption text-ink-sub">{info.daysLeft}일 남음</span>
        )}
      </div>
      <div className="flex items-end gap-3">
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <p className={`text-caption ${low ? 'font-bold text-danger' : 'text-ink-sub'}`}>{stockMessage(item, info)}</p>
          <StockBar item={item} bare />
        </div>
        {low && (
          <Link
            to="/orders/recommendation"
            className="relative z-10 inline-flex min-h-9 shrink-0 items-center rounded-lg bg-danger px-3.5 text-label font-bold text-white hover:bg-danger/90"
          >
            발주
          </Link>
        )}
      </div>
    </div>
  )
}
