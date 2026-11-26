import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { DropdownMenu } from 'radix-ui'
import { ChevronDown, EllipsisVertical, Pencil, Plus } from 'lucide-react'
import { Screen } from '@/components/common/layout'
import { Card, Pill } from '@/components/common/ui'
import StockBar from '@/features/inventory/components/StockBar'
import InventoryTabs from '@/features/inventory/components/InventoryTabs'
import { MenuSelect, MenuTextField } from '@/features/menu/components/MenuFields'
import { useInventory } from '@/features/inventory/queries'
import { ITEM_CATEGORIES, ITEM_UNITS } from '@/features/inventory/mock'
import PullToRefresh from '@/features/inventory/components/PullToRefresh'
import { Banner } from '@/components/ui/banner'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { Tooltip } from '@/components/ui/tooltip'
import { EmptyState } from '@/components/ui/empty-state'
import { toast } from '@/components/ui/toast'
import { won } from '@/lib/format'

const TABS = [
  { id: 'all', label: '전체' },
  { id: 'low', label: '부족' },
  { id: 'expiring', label: '임박' },
  { id: 'check', label: '실사 필요' },
]

const ESTIMATE_HELP =
  '추정 재고는 POS 판매량 × 레시피 사용량을 마지막 실사 수량에서 뺀 값이에요. 실제와 다를 수 있어 주 1회 실사로 맞춰요.'

// 목업 기준일 (다른 목업과 같은 날)
const TODAY = new Date('2026-11-26T00:00:00')
const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']
const dayText = (days) => {
  if (days <= 0) return '오늘'
  if (days === 1) return '내일'
  const d = new Date(TODAY)
  d.setDate(d.getDate() + days)
  return `${d.getMonth() + 1}/${d.getDate()}(${WEEKDAYS[d.getDay()]})`
}

// 상태 — 부족(안전재고 아래) > 임박(소비기한) > 실사 필요 > 안정
const LOOK = {
  low: { label: '부족', tone: 'warn', border: 'border-t-danger' },
  expiring: { label: '임박', tone: 'amber', border: 'border-t-amber-500' },
  check: { label: '실사 필요', tone: 'gray', border: 'border-t-ink-mute' },
  ok: { label: '안정', tone: 'ok', border: 'border-t-success' },
}

/** 품목 하나의 재고 계산 (관리 단위 기준) — 실제로는 서버가 계산해서 내려준다 */
function stockInfo(item) {
  const packs = (item.lots ?? []).reduce((sum, lot) => sum + lot.qty, 0)
  const stock = packs * (item.packSize || 1)
  const low = item.lots && item.safeStock ? stock < item.safeStock : item.tags?.includes('low')
  const state = low ? 'low' : item.tags?.includes('expiring') ? 'expiring' : item.tags?.includes('check') ? 'check' : 'ok'
  const use = item.dailyUse
  return {
    packs,
    stock,
    state,
    daysLeft: use ? Math.floor(stock / use) : null,
    safeDay: use && item.safeStock ? Math.max(0, Math.floor((stock - item.safeStock) / use)) : null,
  }
}

/** 21 재고 (UF-10) — 메뉴 관리와 같은 틀: 탭 → 제목 줄 → 필터 카드 → 분류별 목록 */
export default function InventoryPage() {
  const { data: allItems, refetch } = useInventory()
  const [tab, setTab] = useState('all')
  const [category, setCategory] = useState('ALL')
  const [query, setQuery] = useState('')
  const [closed, setClosed] = useState([]) // 접은 분류
  const [deleted, setDeleted] = useState([]) // 삭제한 품목 id (되돌리기 가능)

  // 삭제는 되돌릴 수 있게 [되돌리기] 토스트로 — TODO API 가 생기면 되돌리기 시간이 지난 뒤 서버에 삭제 요청
  const remove = (item) => {
    setDeleted((ids) => [...ids, item.id])
    toast(`${item.name} 품목을 삭제했어요`, { undo: () => setDeleted((ids) => ids.filter((id) => id !== item.id)) })
  }

  const items = allItems.filter((i) => !deleted.includes(i.id)).map((i) => ({ ...i, info: stockInfo(i) }))
  const inTab = (i) => tab === 'all' || (tab === 'low' ? i.info.state === 'low' : i.tags?.includes(tab))
  const count = (id) => items.filter((i) => id === 'all' || (id === 'low' ? i.info.state === 'low' : i.tags?.includes(id))).length
  const shown = items.filter(
    (i) => inTab(i) && (category === 'ALL' || i.category === category) && i.name.includes(query.trim()),
  )
  const groups = [...ITEM_CATEGORIES, undefined]
    .map((name) => ({ name: name ?? '기타', items: shown.filter((i) => (name ? i.category === name : !ITEM_CATEGORIES.includes(i.category))) }))
    .filter((g) => g.items.length)
  const toggleGroup = (name) => setClosed((list) => (list.includes(name) ? list.filter((x) => x !== name) : [...list, name]))

  const refresh = async () => {
    await refetch()
    toast('재고를 새로 불러왔어요')
  }

  return (
    <Screen title="재고" back={false} tab wide>
      <InventoryTabs />
      <PullToRefresh onRefresh={refresh}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-1 text-h2 font-bold text-ink">
              재고 관리
              <Tooltip label="추정 재고 설명">{ESTIMATE_HELP}</Tooltip>
            </h2>
            <p className="mt-1 text-caption text-ink-sub">판매량으로 계산한 추정 재고예요 · 마지막 실사 11.15</p>
          </div>
          <div className="flex gap-2">
            <Link to="/inventory/adjust" className="inline-flex min-h-10 items-center rounded-input border border-line px-4 text-label font-bold text-ink">
              실사 등록
            </Link>
            <Link
              to="/inventory/items/new/edit"
              className="inline-flex min-h-10 items-center gap-1 rounded-input bg-woori-deep px-4 text-label font-bold text-white"
            >
              <Plus size={16} aria-hidden="true" />
              품목 추가
            </Link>
          </div>
        </div>

        {/* 부족 예상 — 닫으면 오늘은 다시 안 띄운다 */}
        <Banner
          tone="danger"
          title="우유 1L가 내일 오전에 떨어질 것 같아요"
          dismissKey="inventory-low-milk"
          dismissFor="day"
          action={<Link to="/orders/recommendation">발주 추천 보기 ›</Link>}
        >
          내일 비 예보로 사용량이 늘어요.
        </Banner>

        {/* 필터 — 메뉴 관리와 같은 카드 */}
        <Card tone="line" gap="gap-4" pad="p-4 sm:p-5">
          <div className="max-w-lg">
            <SegmentedControl
              label="재고 상태"
              value={tab}
              onChange={setTab}
              items={TABS.map((t) => ({ value: t.id, label: `${t.label} ${count(t.id)}` }))}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <MenuSelect label="분류" value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="ALL">전체 분류</option>
              {ITEM_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </MenuSelect>
            <MenuTextField label="품목 검색" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="품목 이름" />
          </div>
        </Card>

        <p className="text-caption text-ink-sub">
          전체 {items.length}개 · 부족 {count('low')}개 · 조회 {shown.length}개
        </p>

        {groups.length === 0 ? (
          query.trim() ? (
            <EmptyState kind="no-results" compact title={`'${query.trim()}' 품목이 없어요`} description="이름을 다시 확인해 주세요." />
          ) : (
            <EmptyState kind="done" compact title="여기에 해당하는 품목이 없어요" />
          )
        ) : (
          groups.map((g) => {
            const open = !closed.includes(g.name)
            const lowCount = g.items.filter((i) => i.info.state === 'low').length
            return (
              <section key={g.name} aria-label={g.name} className="flex flex-col gap-3">
                <button
                  type="button"
                  onClick={() => toggleGroup(g.name)}
                  aria-expanded={open}
                  className="flex items-center gap-2 rounded-lg py-1 text-left focus-visible:outline-2 focus-visible:outline-woori-blue"
                >
                  <span aria-hidden="true" className="h-5 w-1 rounded-full bg-woori-blue" />
                  <span className="text-body font-bold text-ink">{g.name}</span>
                  <span className="text-caption text-ink-mute">{g.items.length}개</span>
                  <span aria-hidden="true" className="h-px flex-1 bg-line" />
                  {lowCount > 0 && <Pill tone="warn">부족 {lowCount}</Pill>}
                  <ChevronDown size={16} aria-hidden="true" className={`text-ink-mute transition-transform ${open ? 'rotate-180' : ''}`} />
                </button>
                {open && (
                  <ul className="grid gap-3 md:grid-cols-2">
                    {g.items.map((i) => (
                      <li key={i.id}>
                        <ItemCard item={i} onDelete={() => remove(i)} />
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            )
          })
        )}
      </PullToRefresh>
    </Screen>
  )
}

/** 품목 카드 — 이름 · 상태, 현재 양 · 안전재고 아래로 내려가는 날 · 소진 예상일, 남은 양 막대, [재고 수정] [발주하기] */
function ItemCard({ item, onDelete }) {
  const { info } = item
  const look = LOOK[info.state]
  const unit = ITEM_UNITS.find((u) => u.value === item.unit)?.label ?? ''
  const low = info.state === 'low'

  return (
    <div className={`flex h-full flex-col gap-2.5 rounded-input border border-t-4 border-line bg-white p-4 ${look.border}`}>
      <div className="flex items-start gap-2">
        <Link to={`/inventory/items/${item.id}`} className="min-w-0 flex-1 text-body font-bold text-ink hover:text-woori-blue">
          {item.name}
        </Link>
        {info.daysLeft != null && (
          <span className={`num shrink-0 text-caption ${low ? 'font-bold text-danger' : 'text-ink-sub'}`}>
            {info.daysLeft}일분
          </span>
        )}
        <Pill tone={look.tone}>{look.label}</Pill>
      </div>

      <p className="text-caption leading-relaxed text-ink-sub">
        {item.lots ? (
          <>
            현재 {won(info.packs)}
            {item.packLabel ?? '개'}
            {item.packSize > 1 && ` (${won(info.stock)}${unit})`}
            {info.safeDay != null && (
              <span className={info.safeDay === 0 ? 'font-bold text-danger' : ''}> · {dayText(info.safeDay)} 안전재고 아래</span>
            )}
            {info.daysLeft != null && <> · {dayText(info.daysLeft)} 소진</>}
          </>
        ) : (
          item.value
        )}
      </p>

      <StockBar item={item} />

      <div className="mt-auto flex items-center gap-1 pt-1">
        <Link
          to={`/inventory/items/${item.id}/edit`}
          className="inline-flex min-h-10 items-center gap-1 rounded-lg px-2 text-label text-ink-sub hover:bg-surface-muted hover:text-ink"
        >
          <Pencil size={15} aria-hidden="true" />
          재고 수정
        </Link>
        <RowMenu item={item} onDelete={onDelete} />
        <Link
          to="/orders/recommendation"
          className={`ml-auto inline-flex min-h-10 items-center rounded-lg px-4 text-label font-bold ${
            low ? 'bg-danger text-white hover:bg-danger/90' : 'bg-surface-muted text-ink-sub hover:text-ink'
          }`}
        >
          발주하기
        </Link>
      </div>
    </div>
  )
}

function RowMenu({ item, onDelete }) {
  const navigate = useNavigate()
  const entries = [
    ['상세 보기', `/inventory/items/${item.id}`],
    ['실사 등록', '/inventory/adjust'],
    ['폐기 등록', '/inventory/adjust/discard'],
  ]
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        aria-label={`${item.name} 메뉴`}
        className="rounded-md p-2 text-ink-sub hover:bg-surface-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-woori-blue"
      >
        <EllipsisVertical size={18} />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="start"
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
