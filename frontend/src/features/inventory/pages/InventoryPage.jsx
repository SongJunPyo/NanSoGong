import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { DropdownMenu } from 'radix-ui'
import { ChevronDown, EllipsisVertical, Plus, Search, X } from 'lucide-react'
import { Screen } from '@/components/common/layout'
import StockBar from '@/features/inventory/components/StockBar'
import InventoryTabs from '@/features/inventory/components/InventoryTabs'
import PullToRefresh from '@/features/inventory/components/PullToRefresh'
import { useInventory } from '@/features/inventory/queries'
import { ITEM_CATEGORIES } from '@/features/inventory/mock'
import { DATA_AT, STATES, byUrgency, emptyText, incomingText, qtyText, reasonText, stockInfo } from '@/features/inventory/stock'
import { useIsDesktop } from '@/hooks/useViewport'
import { EmptyState } from '@/components/ui/empty-state'
import { Modal } from '@/components/ui/modal'
import { Sheet } from '@/components/ui/sheet'
import { toast } from '@/components/ui/toast'
import { won } from '@/lib/format'

/*
 * 21 재고 (UF-10) — 재고 카드 설계안 (인간공학 · HCI)
 *   목표: 카드 한 장을 1초 안에 읽고, 엄지 한 번으로 다음 행동
 *   ① 무엇 · 상태 → ② 얼마나(가장 큰 글자) → ③ 언제 · 왜(부족 · 임박만) → ④ 기준 대비 막대 → ⑤ 다음 행동 하나
 *   색은 막대와 뱃지 두 곳에만, 뱃지는 글자 + 기호(● ◐ ⇣ ○)로 색 없이도 구분
 *   보조 글자는 #4B5563 (흰 바탕 대비 약 7.6:1, WCAG AA 4.5:1 이상)
 */
const SUB = 'text-[#4B5563]'
const FILTERS = [
  { id: 'all', label: '전체' },
  { id: 'low', label: '부족' },
  { id: 'expiring', label: '임박' },
  { id: 'incoming', label: '입고 예정' },
]
const CATEGORY_ICON = { 유제품: '🥛', 원두: '☕', '시럽 · 소스': '🍯', 포장재: '🥤', 디저트: '🧁', 기타: '📦' }

/** 부족 · 임박일 때의 주요 행동 하나 (여유 · 입고 예정은 버튼 없음) */
function primaryAction(item, info) {
  if (info.state === 'low') {
    const d = item.draft
    return { to: '/orders/recommendation', label: d ? `AI 발주안 보기 · ${qtyText(d.qty)} ${won(d.amount)}원` : 'AI 발주안 보기' }
  }
  if (info.state === 'expiring') {
    // 기한이 이미 지났으면 폐기 등록, 아니면 먼저 쓸 입고분 (상세의 입고분 목록으로 바로)
    return info.expired
      ? { to: `/inventory/adjust/discard?item=${item.id}`, label: `기한 지난 ${qtyText(info.expired)} 폐기 등록` }
      : { to: `/inventory/items/${item.id}#lots`, label: '먼저 쓸 입고분 보기' }
  }
  return null
}

export default function InventoryPage() {
  const { data: allItems, refetch } = useInventory()
  const desktop = useIsDesktop()
  const [filter, setFilter] = useState('all')
  const [searching, setSearching] = useState(false)
  const [query, setQuery] = useState('')
  const [closed, setClosed] = useState([]) // 접은 분류
  const [deleted, setDeleted] = useState([]) // 삭제한 품목 id (되돌리기 가능)
  const [deleting, setDeleting] = useState(null) // 삭제 확인 창

  const items = allItems
    .filter((i) => !deleted.includes(i.id))
    .map((i) => ({ ...i, info: stockInfo(i) }))
    .sort(byUrgency)
  const count = (id) => (id === 'all' ? items.length : items.filter((i) => i.info.state === id).length)
  const shown = items.filter((i) => (filter === 'all' || i.info.state === filter) && i.name.includes(query.trim()))
  const groups = ITEM_CATEGORIES.map((name) => ({
    name,
    items: shown.filter((i) => (ITEM_CATEGORIES.includes(i.category) ? i.category : '기타') === name),
  })).filter((g) => g.items.length)
  const toggleGroup = (name) => setClosed((list) => (list.includes(name) ? list.filter((x) => x !== name) : [...list, name]))

  // 삭제 = 확인 창 → 삭제 → [되돌리기] 알림 (TODO API 가 생기면 되돌리기 시간이 지난 뒤 서버에 삭제 요청)
  const confirmDelete = () => {
    const item = deleting
    setDeleted((ids) => [...ids, item.id])
    setDeleting(null)
    toast(`${item.name}을 지웠어요`, { undo: () => setDeleted((ids) => ids.filter((id) => id !== item.id)) })
  }

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
            {/* 좁은 화면에서는 옆으로 밀어 보는 칩 — 오른쪽 흐림으로 더 있다는 단서를 준다 */}
            <div className="relative min-w-0 flex-1">
            <div role="group" aria-label="재고 상태" className="flex gap-2 overflow-x-auto pr-6 [scrollbar-width:none] sm:pr-0">
              {FILTERS.map((f) => {
                const on = filter === f.id
                return (
                  <button
                    key={f.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setFilter(f.id)}
                    className={`min-h-11 shrink-0 rounded-chip px-4 text-label ${
                      on ? 'bg-woori-deep font-bold text-white' : `bg-surface-muted font-medium ${SUB}`
                    }`}
                  >
                    {f.label} <span className="num">{count(f.id)}</span>
                  </button>
                )
              })}
            </div>
              <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-white to-transparent sm:hidden" />
            </div>
            <button
              type="button"
              aria-label="품목 검색"
              onClick={() => setSearching(true)}
              className="inline-flex size-11 shrink-0 items-center justify-center rounded-lg text-ink-sub hover:bg-surface-muted"
            >
              <Search size={20} />
            </button>
          </div>
        )}

        {/* 시스템 상태 — 추정값이 언제 계산됐는지 */}
        <p className={`-mt-1 text-[12px] ${SUB}`}>추정 재고 · {DATA_AT}</p>

        {shown.length === 0 ? (
          query.trim() ? (
            <EmptyState kind="no-results" compact title={`'${query.trim()}' 품목이 없어요`} description="이름을 다시 확인해 주세요." />
          ) : (
            <EmptyState kind="done" compact title="여기에 해당하는 품목이 없어요" />
          )
        ) : desktop ? (
          <InventoryTable groups={groups} closed={closed} onToggle={toggleGroup} onDelete={setDeleting} />
        ) : (
          groups.map((g) => (
            <section key={g.name} aria-label={g.name} className="flex flex-col gap-3">
              <GroupHead group={g} open={!closed.includes(g.name)} onToggle={() => toggleGroup(g.name)} />
              {!closed.includes(g.name) && (
                <ul className="flex flex-col gap-3">
                  {g.items.map((i) => (
                    <li key={i.id}>
                      <ItemCard item={i} onDelete={() => setDeleting(i)} />
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))
        )}

        <Link
          to="/inventory/items/new/edit"
          className="inline-flex min-h-12 items-center justify-center gap-1 rounded-input border border-line text-label font-bold text-ink hover:bg-surface-muted"
        >
          <Plus size={16} aria-hidden="true" />
          품목 추가
        </Link>
      </PullToRefresh>

      <Modal
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="품목을 지울까요?"
        description={`${deleting?.name ?? ''}을 재고 목록에서 지워요. 바로 뒤에 [되돌리기]로 되살릴 수 있어요.`}
        confirmLabel="삭제"
        tone="danger"
        onConfirm={confirmDelete}
      />
    </Screen>
  )
}

/** 분류 제목 — 누르면 접고 펼친다 */
function GroupHead({ group, open, onToggle }) {
  const lowCount = group.items.filter((i) => i.info.state === 'low').length
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      className="flex min-h-11 items-center gap-2 rounded-lg text-left focus-visible:outline-2 focus-visible:outline-woori-blue"
    >
      <span aria-hidden="true" className="h-5 w-1 rounded-full bg-woori-blue" />
      <span className="text-body font-bold text-ink">{group.name}</span>
      <span className={`text-caption ${SUB}`}>{group.items.length}개</span>
      <span aria-hidden="true" className="h-px flex-1 bg-line" />
      {lowCount > 0 && (
        <span className={`rounded-md px-1.5 py-0.5 text-[12px] font-bold ${STATES.low.badge}`}>
          {STATES.low.mark} 부족 {lowCount}
        </span>
      )}
      <ChevronDown size={18} aria-hidden="true" className={`text-ink-sub transition-transform ${open ? 'rotate-180' : ''}`} />
    </button>
  )
}

/** 상태 뱃지 — 글자 + 기호 */
function StateBadge({ state }) {
  const s = STATES[state]
  return (
    <span className={`inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-[13px] leading-none font-bold ${s.badge}`}>
      <span aria-hidden="true">{s.mark}</span>
      {s.label}
    </span>
  )
}

/** 앱: 재고 카드 — 숫자 간격은 관련 정보 4px(gap-1) / 묶음 사이 12px(gap-3) */
function ItemCard({ item, onDelete }) {
  const { info } = item
  const action = primaryAction(item, info)
  const reason = reasonText(info)

  return (
    <div className="relative flex flex-col gap-3 rounded-card border border-line bg-white p-4">
      {/* ① 무엇 · 상태 */}
      <div className="flex items-center gap-2">
        <span aria-hidden="true" className="text-[18px] leading-none">
          {CATEGORY_ICON[item.category] ?? CATEGORY_ICON.기타}
        </span>
        <Link
          to={`/inventory/items/${item.id}`}
          className="min-w-0 flex-1 truncate text-[16px] font-bold text-ink after:absolute after:inset-0 after:rounded-card focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-woori-blue"
        >
          {item.name}
        </Link>
        <StateBadge state={info.state} />
        <MoreMenu item={item} onDelete={onDelete} />
      </div>

      {/* ② 얼마나 + ③ 언제 · 왜 (붙여서 4px) */}
      <div className="flex flex-col gap-1">
        <p className="num text-[24px] leading-tight font-bold text-ink">{qtyText(info.left)} 남음</p>
        {reason && <p className={`text-[13px] ${SUB}`}>{reason}</p>}
        {info.state === 'incoming' && (
          <p className="text-[13px] font-bold text-woori-deep">{incomingText(item.incoming)}</p>
        )}
      </div>

      {/* ④ 기준 대비 위치 */}
      <StockBar item={item} info={info} />

      {/* ⑤ 다음 행동 하나 — 카드 폭 전체 · 48px · 파랑 */}
      {action && (
        <Link
          to={action.to}
          className={`relative z-10 inline-flex min-h-12 w-full items-center justify-center rounded-input px-4 text-label font-bold transition-transform duration-100 active:scale-[0.98] ${
            info.state === 'low' ? 'bg-woori-deep text-white hover:bg-woori-blue' : 'border border-woori-deep text-woori-deep hover:bg-woori-tint'
          }`}
        >
          {action.label}
        </Link>
      )}
    </div>
  )
}

/** ⋮ 추가 행동 — 앱은 바텀시트, 웹은 드롭다운. 삭제는 맨 아래(엄지가 덜 닿는 곳) */
function MoreMenu({ item, onDelete }) {
  const desktop = useIsDesktop()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  // '상세 보기'는 카드를 누르는 것과 같아서 뺐다 (힉의 법칙: 선택지 줄이기)
  const entries = [
    ['수정', `/inventory/items/${item.id}/edit`],
    ['실사 등록', `/inventory/adjust?item=${item.id}`],
    ['폐기 등록', `/inventory/adjust/discard?item=${item.id}`],
  ]
  const trigger =
    'relative z-10 -my-2 -mr-2 inline-flex size-11 shrink-0 items-center justify-center rounded-lg text-ink-sub hover:bg-surface-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-woori-blue'

  if (desktop) {
    return (
      <DropdownMenu.Root>
        <DropdownMenu.Trigger aria-label={`${item.name} 더 보기`} className={trigger}>
          <EllipsisVertical size={18} />
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content align="end" sideOffset={4} className="animate-fade-in z-50 min-w-[140px] rounded-input border border-line bg-white p-1 shadow-lg">
            {entries.map(([label, to]) => (
              <DropdownMenu.Item
                key={label}
                onSelect={() => navigate(to)}
                className="cursor-pointer rounded-lg px-3 py-2.5 text-label text-ink outline-none data-[highlighted]:bg-surface-muted"
              >
                {label}
              </DropdownMenu.Item>
            ))}
            <DropdownMenu.Separator className="my-1 h-px bg-line" />
            <DropdownMenu.Item
              onSelect={onDelete}
              className="cursor-pointer rounded-lg px-3 py-2.5 text-label font-medium text-danger outline-none data-[highlighted]:bg-danger-bg"
            >
              삭제
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    )
  }

  return (
    <>
      <button type="button" aria-label={`${item.name} 더 보기`} onClick={() => setOpen(true)} className={trigger}>
        <EllipsisVertical size={20} />
      </button>
      <Sheet open={open} onOpenChange={setOpen} title={item.name}>
        <div className="flex flex-col gap-2">
          {entries.map(([label, to]) => (
            <button
              key={label}
              type="button"
              onClick={() => {
                setOpen(false)
                navigate(to)
              }}
              className="min-h-12 rounded-input bg-surface-muted px-4 text-left text-body font-medium text-ink active:bg-line"
            >
              {label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => {
              setOpen(false)
              onDelete()
            }}
            className="mt-2 min-h-12 rounded-input px-4 text-left text-body font-medium text-danger active:bg-danger-bg"
          >
            삭제
          </button>
        </div>
      </Sheet>
    </>
  )
}

/**
 * 웹: 표 하나 = 품목 · 상태 · 남은 양 · 막대 · 소진 시점 · 행동. 분류는 표 안의 묶음 줄로
 *   (분류마다 표를 따로 그리면 열 위치가 표마다 달라 위아래 비교가 안 된다 → 열 너비 고정 · 머리줄 한 번)
 *   체크박스로 골라 한꺼번에 발주
 */
function InventoryTable({ groups, closed, onToggle, onDelete }) {
  const navigate = useNavigate()
  const [selected, setSelected] = useState([])
  const visibleIds = groups.flatMap((g) => (closed.includes(g.name) ? [] : g.items.map((i) => i.id)))
  const picked = selected.filter((id) => visibleIds.includes(id))
  const toggle = (id) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))

  return (
    <div className="flex flex-col gap-3">
      {picked.length > 0 && (
        <div aria-live="polite" className="sticky top-[152px] z-10 flex items-center gap-2 rounded-input bg-woori-tint px-4 py-2.5">
          <span className="text-label font-bold text-woori-deep">{picked.length}개 선택</span>
          <button
            type="button"
            onClick={() => navigate('/orders/recommendation')}
            className="ml-auto h-10 rounded-lg bg-woori-deep px-4 text-label font-bold text-white hover:bg-woori-blue"
          >
            선택한 {picked.length}개 한꺼번에 발주
          </button>
          <button type="button" onClick={() => setSelected([])} className={`h-10 px-2 text-label ${SUB}`}>
            선택 해제
          </button>
        </div>
      )}
      <div className="overflow-hidden rounded-card border border-line">
        <table className="w-full table-fixed text-left">
          <colgroup>
            <col className="w-12" />
            <col className="w-[16%]" />
            <col className="w-24" />
            <col className="w-20" />
            <col className="w-[18%]" />
            <col />
            <col className="w-56" />
            <col className="w-14" />
          </colgroup>
          <thead className={`bg-surface-muted text-caption ${SUB}`}>
            <tr>
              <th className="px-4 py-2.5">
                <span className="sr-only">선택</span>
              </th>
              <th className="py-2.5 font-medium">품목</th>
              <th className="py-2.5 font-medium">상태</th>
              <th className="py-2.5 pr-4 text-right font-medium">남은 양</th>
              <th className="py-2.5 pr-6 font-medium">적정 대비</th>
              <th className="py-2.5 font-medium">소진 · 도착</th>
              <th className="py-2.5 font-medium">
                <span className="sr-only">행동</span>
              </th>
              <th />
            </tr>
          </thead>
          {groups.map((g) => {
            const open = !closed.includes(g.name)
            return (
              <tbody key={g.name}>
                <tr className="border-t border-line bg-white">
                  <td colSpan={8} className="px-4 pt-2">
                    <GroupHead group={g} open={open} onToggle={() => onToggle(g.name)} />
                  </td>
                </tr>
                {open &&
                  g.items.map((i) => {
                    const action = primaryAction(i, i.info)
                    return (
                      <tr key={i.id} title={reasonText(i.info) || undefined} className="border-t border-line/60 hover:bg-surface-muted/60">
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            aria-label={`${i.name} 선택`}
                            checked={selected.includes(i.id)}
                            onChange={() => toggle(i.id)}
                            className="size-4 accent-woori-deep"
                          />
                        </td>
                        <td className="truncate py-3">
                          <Link to={`/inventory/items/${i.id}`} className="text-body font-bold text-ink hover:text-woori-blue">
                            {i.name}
                          </Link>
                        </td>
                        <td className="py-3">
                          <StateBadge state={i.info.state} />
                        </td>
                        <td className="num py-3 pr-4 text-right text-[18px] font-bold text-ink">{qtyText(i.info.left)}</td>
                        <td className="py-3 pr-6">
                          <StockBar item={i} info={i.info} />
                        </td>
                        <td className={`py-3 text-label ${SUB}`}>
                          {i.info.state === 'incoming' ? (
                            <span className="font-bold text-woori-deep">{incomingText(i.incoming)}</span>
                          ) : (
                            emptyText(i.info.daysLeft)
                          )}
                        </td>
                        <td className="py-3 pr-2 text-right">
                          {action && (
                            <Link
                              to={action.to}
                              className={`inline-flex h-10 max-w-full items-center truncate rounded-lg px-3 text-caption font-bold ${
                                i.info.state === 'low' ? 'bg-woori-deep text-white hover:bg-woori-blue' : 'border border-woori-deep text-woori-deep hover:bg-woori-tint'
                              }`}
                            >
                              {action.label}
                            </Link>
                          )}
                        </td>
                        <td className="py-3 pr-3 text-right">
                          <MoreMenu item={i} onDelete={() => onDelete(i)} />
                        </td>
                      </tr>
                    )
                  })}
              </tbody>
            )
          })}
        </table>
      </div>
    </div>
  )
}
