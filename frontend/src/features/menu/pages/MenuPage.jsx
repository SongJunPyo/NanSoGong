import { useState } from 'react'
import { ChevronDown, Pencil, Plus, RotateCcw, Search, X } from 'lucide-react'
import { Screen } from '@/components/common/layout'
import { Card, H2, Pill } from '@/components/common/ui'
import { Sheet } from '@/components/ui/sheet'
import { Modal } from '@/components/ui/modal'
import { SkeletonCard } from '@/components/ui/loading'
import { toast } from '@/components/ui/toast'
import { won } from '@/lib/format'
import { useMenuActions, useMenuWorkspace } from '@/features/menu/queries'
import { categoryOf, GROUPS, menuStatus, recipeUnit, seasonLabel } from '@/features/menu/menuLogic'
import MenuTabs from '@/features/menu/components/MenuTabs'
import MenuViewControl from '@/features/menu/components/MenuViewControl'
import MenuForm from '@/features/menu/components/MenuForm'
import MenuOptions from '@/features/menu/components/MenuOptions'
import MenuHistory from '@/features/menu/components/MenuHistory'
import { CategoryCreator, MenuSelect } from '@/features/menu/components/MenuFields'

const STATUS_FILTERS = [
  { code: 'SELLING', label: '판매 중', mark: '●', color: 'text-woori-deep' },
  { code: 'PAUSED', label: '판매 중지', mark: 'Ⅱ', color: 'text-[#4b5563]' },
  { code: 'OFF_SEASON', label: '시즌 외', mark: '◷', color: 'text-[#956000]' },
]
const SECONDARY = 'min-h-11 rounded-input border border-line bg-white px-4 text-label font-bold text-ink hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-woori-blue disabled:opacity-50'

export default function MenuPage() {
  const query = useMenuWorkspace()
  const action = useMenuActions()
  const [view, setView] = useState('menus')
  const [group, setGroup] = useState('ALL')
  const [categoryId, setCategoryId] = useState('ALL')
  const [status, setStatus] = useState('ALL')
  const [search, setSearch] = useState('')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [openId, setOpenId] = useState(null)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(null)
  const [error, setError] = useState('')
  const [deleteError, setDeleteError] = useState('')
  const workspace = query.data
  const edit = (menu) => { setEditing(structuredClone(menu)); setSaving(false) }
  const resetFilters = () => { setGroup('ALL'); setCategoryId('ALL'); setStatus('ALL'); setSearch('') }
  const filtered = group !== 'ALL' || categoryId !== 'ALL' || status !== 'ALL' || Boolean(search.trim())
  const changeSale = async (menu) => {
    setError('')
    try {
      await action.mutateAsync({ type: 'SET_SALE', payload: { id: menu.id, onSale: !menu.onSale } })
      toast(menu.onSale ? '판매를 중지했어요.' : menu.season ? '판매를 준비했어요. 시즌 기간 안에서 판매중으로 표시돼요.' : '판매를 재개했어요.')
    } catch (err) { setError(err.message) }
  }
  const openMenu = async (menu) => {
    setOpenId(openId === menu.id ? null : menu.id)
    if (menu.isNew) {
      try { await action.mutateAsync({ type: 'MARK_SEEN', payload: { id: menu.id } }) }
      catch (err) { setError(err.message) }
    }
  }
  const menus = workspace?.menus.filter((menu) => !menu.deletedAt) ?? []
  const visible = menus.filter((menu) => (group === 'ALL' || categoryOf(workspace, menu)?.parent === group) && (categoryId === 'ALL' || menu.categoryId === categoryId) && (status === 'ALL' || menuStatus(menu).code === status) && (menu.name + ' ' + (menu.posCode ?? '')).toLowerCase().includes(search.trim().toLowerCase()))

  return (
    <Screen title="메뉴" back={false} tab wide compact>
      <MenuTabs />
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2"><h2 className="text-h2 font-bold text-ink">메뉴 관리</h2><span className="rounded-md bg-surface-muted px-2 py-1 text-caption font-bold text-ink-sub">시연 데이터</span></div>
          <p className="mt-1 hidden text-label text-ink-sub sm:block">판매 상태와 가격을 확인하고, 필요한 메뉴만 수정해요.</p>
        </div>
        {view === 'menus' && <button type="button" disabled={!workspace} onClick={() => edit({ categoryId: categoryId === 'ALL' ? 'coffee' : categoryId })} className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-input bg-woori-deep px-4 text-label font-bold text-white hover:bg-woori-blue focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-woori-blue disabled:opacity-50"><Plus size={18} aria-hidden="true" />메뉴 추가</button>}
      </div>
      <div className="max-w-lg"><MenuViewControl label="메뉴 관리 보기" value={view} onChange={setView} items={[{ value: 'menus', label: '메뉴 목록' }, { value: 'options', label: '옵션 관리' }, { value: 'history', label: '메뉴 기록' }]} /></div>
      {query.isPending ? <SkeletonCard lines={5} /> : query.error ? <Card tone="warn"><p role="alert" className="text-label text-danger">{query.error.message}</p><button type="button" onClick={() => query.refetch()} className={SECONDARY}>다시 불러오기</button></Card> : <>
        {view === 'menus' && <>
          <div role="group" aria-label="판매 상태 빠른 필터" className="grid grid-cols-3 gap-2 sm:gap-3">
            {STATUS_FILTERS.map((item) => <button key={item.code} type="button" aria-pressed={status === item.code} onClick={() => setStatus(status === item.code ? 'ALL' : item.code)} className={`flex min-w-0 flex-col gap-2 rounded-card border p-3 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-woori-blue sm:px-4 ${status === item.code ? 'border-woori-deep bg-woori-tint' : 'border-line bg-white hover:bg-surface-muted'}`}>
              <span className={`text-caption font-medium sm:text-label ${item.color}`}><span aria-hidden="true" className="mr-1">{item.mark}</span>{item.label}</span>
              <span className="num text-[24px] leading-none font-bold text-ink">{menus.filter((menu) => menuStatus(menu).code === item.code).length}<span className="ml-1 text-caption font-medium text-ink-sub">개</span></span>
            </button>)}
          </div>
          <Card tone="line" gap="gap-4" pad="p-4">
              <label className="flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-input border border-line bg-white px-3 focus-within:ring-2 focus-within:ring-woori-blue">
                <Search size={18} aria-hidden="true" className="shrink-0 text-ink-sub" />
                <input aria-label="메뉴 검색" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="메뉴명 또는 POS 코드 검색" className="h-11 w-full min-w-0 bg-transparent text-label text-ink outline-none placeholder:text-ink-sub" />
                {search && <button type="button" aria-label="검색어 지우기" onClick={() => setSearch('')} className="-mr-2 inline-flex size-11 shrink-0 items-center justify-center rounded-lg text-ink-sub focus-visible:outline-2 focus-visible:outline-woori-blue"><X size={17} aria-hidden="true" /></button>}
              </label>
            <button type="button" aria-expanded={filtersOpen} aria-controls="menu-list-filters" onClick={() => setFiltersOpen(!filtersOpen)} className="-my-2 flex min-h-11 items-center justify-between rounded-lg text-label font-medium text-ink focus-visible:outline-2 focus-visible:outline-woori-blue sm:hidden"><span>카테고리·상태 필터{(group !== 'ALL' || categoryId !== 'ALL' || status !== 'ALL') && <span className="ml-2 text-caption font-bold text-woori-deep">적용 중</span>}</span><ChevronDown size={17} aria-hidden="true" className={filtersOpen ? 'rotate-180' : undefined} /></button>
            <div id="menu-list-filters" className={`${filtersOpen ? 'grid' : 'hidden'} grid-cols-2 items-end gap-3 sm:grid sm:grid-cols-[1fr_1fr] lg:grid-cols-[1.2fr_1fr_1fr_auto]`}>
              <div className="col-span-2 sm:col-span-1"><p className="mb-1.5 text-caption font-medium text-ink-sub">메뉴 분류</p><MenuViewControl label="메뉴 상위 분류" value={group} onChange={(value) => { setGroup(value); setCategoryId('ALL') }} items={GROUPS} /></div>
              <MenuSelect label="카테고리" value={categoryId} onChange={(event) => setCategoryId(event.target.value)}><option value="ALL">전체 카테고리</option>{workspace.categories.filter((category) => group === 'ALL' || category.parent === group).map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</MenuSelect>
              <MenuSelect label="판매 상태" value={status} onChange={(event) => setStatus(event.target.value)}><option value="ALL">전체 상태</option><option value="SELLING">판매 중</option><option value="PAUSED">판매 중지</option><option value="OFF_SEASON">시즌 외</option></MenuSelect>
              <div className="col-span-2 sm:col-span-1"><CategoryCreator onAdded={(id) => { setGroup('ALL'); setCategoryId(id) }} /></div>
            </div>
          </Card>
          <div className="flex min-h-11 flex-wrap items-center justify-between gap-2">
            <p role="status" className="text-label text-ink-sub">전체 {menus.length}개 중 <strong className="text-ink">{visible.length}개</strong> 표시</p>
            {filtered ? <button type="button" onClick={resetFilters} className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-label font-bold text-woori-deep focus-visible:outline-2 focus-visible:outline-woori-blue"><RotateCcw size={15} aria-hidden="true" />필터 초기화</button> : <span className="text-caption text-ink-sub">메뉴명을 누르면 레시피를 볼 수 있어요.</span>}
          </div>
          {error && <p role="alert" className="rounded-input bg-danger-bg p-3 text-label text-danger">{error}</p>}
          <Card tone="line" gap="gap-0" pad="px-4 sm:px-5">
            <div className="hidden grid-cols-[minmax(0,2fr)_1fr_1fr_1fr_5rem] items-center gap-4 border-b border-line py-3 text-caption font-medium text-ink-sub md:grid"><span>메뉴명 · POS 코드</span><span>카테고리</span><span className="text-right">판매가</span><span className="text-center">판매 상태</span><span className="text-right">관리</span></div>
            <ul className="divide-y divide-line">{visible.map((menu) => {
              const active = openId === menu.id
              const state = menuStatus(menu)
              return <li key={menu.id} className="py-4">
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 md:grid-cols-[minmax(0,2fr)_1fr_1fr_1fr_5rem] md:gap-4">
                  <button type="button" onClick={() => openMenu(menu)} aria-expanded={active} aria-controls={'menu-detail-' + menu.id} className="min-h-11 min-w-0 rounded-lg text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-woori-blue">
                    <span className="flex flex-wrap items-center gap-1.5 text-body font-bold text-ink">{menu.name}{menu.isNew && <Pill tone="deep">NEW</Pill>}<ChevronDown size={16} className={`shrink-0 text-ink-sub motion-safe:transition-transform ${active ? 'rotate-180' : ''}`} aria-hidden="true" /></span>
                    <span className="mt-1 block text-caption text-ink-sub">{menu.posCode ?? 'POS 미연결'}{menu.season ? ' · ' + seasonLabel(menu.season) : ''}</span>
                  </button>
                  <span className="hidden text-label text-ink-sub md:block">{categoryOf(workspace, menu)?.name}</span>
                  <strong className="num text-right text-body text-ink">{won(menu.price)}<span className="ml-0.5 text-caption font-medium">원</span></strong>
                  <div className="flex flex-wrap items-center gap-2 md:justify-center"><Pill tone={state.tone}>{state.label}</Pill><span className="text-caption text-ink-sub md:hidden">{categoryOf(workspace, menu)?.name}</span></div>
                  <button type="button" aria-label={menu.name + ' 수정'} onClick={() => edit(menu)} className="inline-flex min-h-11 items-center justify-center gap-1.5 justify-self-end rounded-lg border border-line px-3 text-label font-bold text-woori-deep hover:bg-woori-tint focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-woori-blue"><Pencil size={14} aria-hidden="true" />수정</button>
                </div>
                {active && <div id={'menu-detail-' + menu.id} className="mt-4 flex flex-col gap-4 rounded-input bg-surface-muted p-4">
                  <div><p className="text-label font-bold text-ink">레시피와 판매 설정</p><p className="mt-1 text-caption leading-relaxed text-ink-sub">{menu.note ?? '직접 등록한 메뉴'} · {menu.sizes.join(' / ') || '사이즈 미지정'} · {menu.temperatures.join(' / ') || '온도 미지정'}</p></div>
                  {menu.priceHistory?.map((entry) => <p key={entry.date} className="text-caption text-woori-deep">가격 이력 {entry.date.slice(0, 7)} · {won(entry.before)}원 → {won(entry.after)}원</p>)}
                  <div className="flex flex-wrap gap-2">{menu.recipe.length ? menu.recipe.map((row, index) => <span key={index} className="rounded-lg bg-white px-3 py-2 text-label text-ink">{row.name} <strong className="num">{won(row.quantity)}{recipeUnit(row.unit)}</strong></span>) : <p className="text-label text-ink-sub">등록된 레시피가 없어요.</p>}</div>
                  <div className="flex flex-wrap gap-2 border-t border-line pt-3"><button type="button" onClick={() => edit(menu)} className={SECONDARY}>메뉴 수정</button><button type="button" disabled={action.isPending} onClick={() => changeSale(menu)} className={SECONDARY}>{menu.onSale ? '판매 중지' : '판매 재개'}</button><button type="button" onClick={() => { setDeleting(menu); setDeleteError('') }} className="min-h-11 rounded-input px-3 text-label text-danger focus-visible:outline-2 focus-visible:outline-danger sm:ml-auto">메뉴 삭제</button></div>
                </div>}
              </li>
            })}</ul>
            {!visible.length && <div role="status" className="flex flex-col items-center gap-3 py-10 text-center"><Search size={25} aria-hidden="true" className="text-ink-sub" /><p className="text-body font-bold text-ink">조건에 맞는 메뉴가 없어요</p><p className="text-label text-ink-sub">검색어나 카테고리, 판매 상태를 바꿔 보세요.</p>{filtered && <button type="button" onClick={resetFilters} className={SECONDARY}>필터 초기화</button>}</div>}
          </Card>
          {workspace.sets.length > 0 && <Card tone="line"><H2>저장한 세트 구성</H2><p className="text-caption text-ink-sub">앱에서 확인한 구성안이에요. 개별 POS 메뉴와 판매 기록은 그대로 유지돼요.</p>{workspace.sets.map((set) => <div key={set.id} className="flex flex-wrap justify-between gap-2 border-t border-line pt-3"><div><p className="text-label font-bold text-ink">{set.name}</p><p className="mt-1 text-caption text-ink-sub">{set.menuIds.map((id) => workspace.menus.find((entry) => entry.id === id)?.name).join(' + ')}</p></div><strong className="num text-label text-woori-deep">{won(set.price)}원</strong></div>)}</Card>}
        </>}
        {view === 'options' && <MenuOptions workspace={workspace} />}
        {view === 'history' && <MenuHistory workspace={workspace} onEdit={edit} />}
      </>}
      <p className="text-caption text-ink-sub">시연 모드 · 변경 내용은 이 브라우저의 시연 데이터에만 저장돼요. 실제 DB·POS에는 반영되지 않아요.</p>
      <Sheet open={Boolean(editing)} onOpenChange={(open) => { if (!open && !saving) setEditing(null) }} title={editing?.id ? '메뉴 수정' : '메뉴 추가'} description="필수 항목을 입력하고, 레시피를 확인한 뒤 저장해 주세요.">
        {editing && workspace && <MenuForm key={editing.id ?? 'new'} initial={editing} onBusyChange={setSaving} onSaved={() => { setEditing(null); setView('menus'); resetFilters() }} onCancel={() => { if (!saving) setEditing(null) }} />}
      </Sheet>
      <Modal open={Boolean(deleting)} onOpenChange={(open) => { if (!open) setDeleting(null) }} title="메뉴를 삭제할까요?" description={(deleting?.name ?? '') + ' 메뉴를 메뉴 기록으로 이동해요. 과거 판매 기록은 유지되며 메뉴 기록에서 복구할 수 있어요.'} confirmLabel="메뉴 삭제" tone="danger" confirmLoading={action.isPending} onConfirm={async () => {
        try { await action.mutateAsync({ type: 'DELETE_MENU', payload: { id: deleting.id } }); setDeleting(null); toast('메뉴 기록으로 이동했어요. 언제든 복구할 수 있어요.') }
        catch (err) { setDeleteError(err.message) }
      }}>{deleteError && <p role="alert" className="text-label text-danger">{deleteError}</p>}</Modal>
    </Screen>
  )
}
