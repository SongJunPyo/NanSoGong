import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { DropdownMenu } from 'radix-ui'
import { EllipsisVertical } from 'lucide-react'
import { Screen } from '@/components/common/layout'
import { Button, Card, Field, ListRow } from '@/components/common/ui'
import { useIsDesktop } from '@/hooks/useViewport'
import { useInventory } from '@/features/inventory/queries'
import PullToRefresh from '@/features/inventory/components/PullToRefresh'
import { Banner } from '@/components/ui/banner'
import { Badge, CountBadge } from '@/components/ui/badge'
import { Tooltip } from '@/components/ui/tooltip'
import { EmptyState } from '@/components/ui/empty-state'
import { toast } from '@/components/ui/toast'

const TABS = [
  { id: 'all', label: '전체' },
  { id: 'low', label: '부족' },
  { id: 'expiring', label: '임박' },
  { id: 'check', label: '실사 필요' },
]
const TAG_LABEL = { low: '부족', expiring: '임박', check: '실사 필요' }

const ESTIMATE_HELP =
  '추정 재고는 POS 판매량 × 레시피 사용량을 마지막 실사 수량에서 뺀 값이에요. 실제와 다를 수 있어 주 1회 실사로 맞춰요.'

/** 21 재고 (UF-10) */
export default function InventoryPage() {
  const { data: allItems, refetch } = useInventory()
  const desktop = useIsDesktop()
  const [tab, setTab] = useState('all')
  const [query, setQuery] = useState('')
  const [deleted, setDeleted] = useState([]) // 삭제한 품목 id (되돌리기 가능)

  // 삭제는 되돌릴 수 있게 [되돌리기] 토스트로 — TODO API 가 생기면 되돌리기 시간이 지난 뒤 서버에 삭제 요청
  const remove = (item) => {
    setDeleted((ids) => [...ids, item.id])
    toast(`${item.name} 품목을 삭제했어요`, { undo: () => setDeleted((ids) => ids.filter((id) => id !== item.id)) })
  }

  const items = allItems.filter((i) => !deleted.includes(i.id))
  const count = (id) => (id === 'all' ? items.length : items.filter((i) => i.tags?.includes(id)).length)
  const inTab = tab === 'all' ? items : items.filter((i) => i.tags?.includes(tab))
  const shown = query.trim() ? inTab.filter((i) => i.name.includes(query.trim())) : inTab

  const refresh = async () => {
    await refetch()
    toast('재고를 새로 불러왔어요')
  }

  return (
    <Screen title="재고" back={false} tab wide>
      <PullToRefresh onRefresh={refresh}>
        <div className="-mb-2 flex justify-end">
          <Button variant="text" to="/orders">
            발주 목록 보기 ›
          </Button>
        </div>

        {/* 부족 예상 — 닫으면 오늘은 다시 안 띄운다 */}
        <Banner
          tone="danger"
          title="우유 1L가 내일 오전에 떨어질 것 같아요"
          dismissKey="inventory-low-milk"
          dismissFor="day"
          action={<Link to="/orders/recommendation">발주 추천 보기 ›</Link>}
        >
          내일 비 예보로 사용량이 늘어요. 추정 4개 남았어요.
        </Banner>

        <Field placeholder="품목 검색" value={query} onChange={(e) => setQuery(e.target.value)} />

        {/* 상단 탭 + 개수 */}
        <div role="tablist" aria-label="재고 분류" className="flex gap-1.5 overflow-x-auto">
          {TABS.map((t) => {
            const on = tab === t.id
            return (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => setTab(t.id)}
                className={`flex shrink-0 items-center gap-1.5 rounded-chip px-3.5 py-2 text-[13px] ${
                  on ? 'bg-woori-deep font-bold text-white' : 'bg-surface-muted font-medium text-ink-sub'
                }`}
              >
                {t.label}
                <CountBadge
                  count={count(t.id)}
                  showZero
                  tone={on ? 'muted' : t.id === 'low' ? 'alert' : 'muted'}
                  className={on ? 'bg-white text-woori-deep' : undefined}
                />
              </button>
            )
          })}
        </div>

        <div className="flex items-center gap-1 text-label text-ink-sub">
          추정 재고
          <Tooltip label="추정 재고 설명">{ESTIMATE_HELP}</Tooltip>
          <span className="ml-auto text-caption text-ink-mute">마지막 실사 11.15</span>
        </div>

        {shown.length === 0 ? (
          query.trim() ? (
            <EmptyState kind="no-results" compact title={`'${query.trim()}' 품목이 없어요`} description="이름을 다시 확인해 주세요." />
          ) : (
            <EmptyState kind="done" compact title="여기에 해당하는 품목이 없어요" />
          )
        ) : desktop ? (
          <InventoryTable items={shown} onDelete={remove} />
        ) : (
          <Card tone="line" gap="gap-0" pad="px-4 py-1">
            {shown.map((i) => (
              <ListRow
                key={i.id}
                title={
                  <span className="flex flex-wrap items-center gap-1.5">
                    {i.name}
                    {i.tags?.map((tag) => (
                      <Badge key={tag}>{TAG_LABEL[tag]}</Badge>
                    ))}
                  </span>
                }
                value={i.value}
                to={`/inventory/items/${i.id}`}
              />
            ))}
          </Card>
        )}

        <Button variant="outline" to="/inventory/items/milk/edit">
          + 품목 추가·수정
        </Button>
      </PullToRefresh>
    </Screen>
  )
}

/** 웹: 표 + 여러 품목 일괄 선택 + 행마다 ⋮ 메뉴 */
function InventoryTable({ items, onDelete }) {
  const navigate = useNavigate()
  const [selected, setSelected] = useState([])
  const ids = items.map((i) => i.id)
  const picked = selected.filter((id) => ids.includes(id)) // 탭 · 검색으로 안 보이게 된 품목은 빼고 센다
  const allOn = picked.length === items.length
  const toggle = (id) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))

  return (
    <div className="flex flex-col gap-2">
      {picked.length > 0 && (
        <div className="flex items-center gap-2 rounded-input bg-woori-tint px-4 py-2.5" aria-live="polite">
          <span className="text-label font-bold text-woori-deep">{picked.length}개 선택</span>
          <div className="ml-auto flex gap-1.5">
            <button
              type="button"
              onClick={() => navigate('/inventory/adjust')}
              className="h-9 rounded-lg bg-white px-3 text-label font-bold text-ink"
            >
              실사 등록
            </button>
            <button
              type="button"
              onClick={() => navigate('/orders/recommendation')}
              className="h-9 rounded-lg bg-woori-deep px-3 text-label font-bold text-white"
            >
              발주 추천 보기
            </button>
            <button type="button" onClick={() => setSelected([])} className="h-9 px-2 text-label text-ink-sub">
              선택 해제
            </button>
          </div>
        </div>
      )}
      <div className="overflow-hidden rounded-card border border-line">
        <table className="w-full text-left">
          <thead className="bg-surface-muted text-label text-ink-sub">
            <tr>
              <th className="w-12 px-4 py-3">
                <input
                  type="checkbox"
                  aria-label="모두 선택"
                  checked={allOn}
                  onChange={() => setSelected(allOn ? [] : ids)}
                  className="size-4 accent-woori-deep"
                />
              </th>
              <th className="py-3 font-medium">품목</th>
              <th className="py-3 font-medium">상태</th>
              <th className="py-3 text-right font-medium">추정 재고</th>
              <th className="w-14 py-3">
                <span className="sr-only">메뉴</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((i) => (
              <tr key={i.id} className="border-t border-line hover:bg-surface-muted/60">
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    aria-label={`${i.name} 선택`}
                    checked={selected.includes(i.id)}
                    onChange={() => toggle(i.id)}
                    className="size-4 accent-woori-deep"
                  />
                </td>
                <td className="py-3">
                  <Link to={`/inventory/items/${i.id}`} className="text-body font-medium text-ink hover:text-woori-blue">
                    {i.name}
                  </Link>
                </td>
                <td className="py-3">
                  <span className="flex gap-1">
                    {i.tags?.length ? i.tags.map((tag) => <Badge key={tag}>{TAG_LABEL[tag]}</Badge>) : <Badge status="neutral">정상</Badge>}
                  </span>
                </td>
                <td className="num py-3 text-right text-body font-bold text-woori-blue">{i.value}</td>
                <td className="py-3 pr-3 text-right">
                  <RowMenu item={i} onDelete={() => onDelete(i)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function RowMenu({ item, onDelete }) {
  const navigate = useNavigate()
  const entries = [
    ['상세 보기', `/inventory/items/${item.id}`],
    ['수정', `/inventory/items/${item.id}/edit`],
    ['실사 등록', '/inventory/adjust'],
    ['폐기 등록', '/inventory/adjust/discard'],
  ]
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        aria-label={`${item.name} 메뉴`}
        className="rounded-md p-1.5 text-ink-sub hover:bg-surface-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-woori-blue"
      >
        <EllipsisVertical size={18} />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={4}
          className="animate-fade-in z-50 min-w-[140px] rounded-input border border-line bg-white p-1 shadow-lg"
        >
          {entries.map(([label, to]) => (
            <DropdownMenu.Item
              key={label}
              onSelect={() => navigate(to)}
              className="cursor-pointer rounded-lg px-3 py-2 text-label text-ink outline-none data-[highlighted]:bg-surface-muted"
            >
              {label}
            </DropdownMenu.Item>
          ))}
          <DropdownMenu.Separator className="my-1 h-px bg-line" />
          <DropdownMenu.Item
            onSelect={onDelete}
            className="cursor-pointer rounded-lg px-3 py-2 text-label font-medium text-danger outline-none data-[highlighted]:bg-danger-bg"
          >
            삭제
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}
