import { useState } from 'react'
import { ChevronDown, Pencil, Plus, Trash2 } from 'lucide-react'
import { Screen } from '@/components/common/layout'
import { Card, H2, Pill } from '@/components/common/ui'
import { Sheet } from '@/components/ui/sheet'
import { Modal } from '@/components/ui/modal'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { SkeletonCard } from '@/components/ui/loading'
import { toast } from '@/components/ui/toast'
import { won } from '@/lib/format'
import { useMenuActions, useMenuWorkspace } from '@/features/menu/queries'
import { categoryOf, GROUPS, menuStatus, recipeUnit, seasonLabel } from '@/features/menu/menuLogic'
import MenuTabs from '@/features/menu/components/MenuTabs'
import MenuForm from '@/features/menu/components/MenuForm'
import MenuOptions from '@/features/menu/components/MenuOptions'
import MenuHistory from '@/features/menu/components/MenuHistory'
import { CategoryCreator, MenuSelect, MenuTextField } from '@/features/menu/components/MenuFields'

export default function MenuPage() {
  const query = useMenuWorkspace()
  const action = useMenuActions()
  const [view, setView] = useState('menus')
  const [group, setGroup] = useState('ALL')
  const [categoryId, setCategoryId] = useState('ALL')
  const [status, setStatus] = useState('ALL')
  const [search, setSearch] = useState('')
  const [openId, setOpenId] = useState(null)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(null)
  const [error, setError] = useState('')
  const [deleteError, setDeleteError] = useState('')
  const workspace = query.data
  const edit = (menu) => { setEditing(structuredClone(menu)); setSaving(false) }
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
    <Screen title="메뉴" back={false} tab wide>
      <MenuTabs />
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-h2 font-bold text-ink">메뉴 관리</h2><p className="mt-1 text-caption text-ink-sub">시연 메뉴·옵션을 관리해요. 실제 DB·POS에는 반영되지 않아요.</p></div><div className="flex gap-2"><button type="button" onClick={() => setView('history')} className="min-h-10 rounded-input border border-line px-4 text-label font-bold text-ink">메뉴 기록</button><button type="button" disabled={!workspace} onClick={() => edit({ categoryId: categoryId === 'ALL' ? 'coffee' : categoryId })} className="inline-flex min-h-10 items-center gap-1 rounded-input bg-woori-deep px-4 text-label font-bold text-white"><Plus size={16} aria-hidden="true" />메뉴 추가</button></div></div>
      <div className="max-w-lg"><SegmentedControl label="메뉴 관리 보기" value={view} onChange={setView} items={[{ value: 'menus', label: '메뉴 목록' }, { value: 'options', label: '옵션 관리' }, { value: 'history', label: '메뉴 기록' }]} /></div>
      {query.isPending ? <SkeletonCard lines={5} /> : query.error ? <Card tone="warn"><p role="alert" className="text-label text-danger">{query.error.message}</p><button type="button" onClick={() => query.refetch()} className="text-label font-bold text-woori-deep">다시 불러오기</button></Card> : <>
        {view === 'menus' && <>
          <Card tone="line" gap="gap-4" pad="p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3"><div className="w-full max-w-xs"><SegmentedControl label="메뉴 상위 분류" value={group} onChange={(value) => { setGroup(value); setCategoryId('ALL') }} items={GROUPS} /></div><CategoryCreator onAdded={(id) => { setGroup('ALL'); setCategoryId(id) }} /></div>
            <div className="grid gap-3 sm:grid-cols-3"><MenuSelect label="하위 카테고리" value={categoryId} onChange={(event) => setCategoryId(event.target.value)}><option value="ALL">전체 카테고리</option>{workspace.categories.filter((category) => group === 'ALL' || category.parent === group).map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</MenuSelect><MenuSelect label="판매 상태" value={status} onChange={(event) => setStatus(event.target.value)}><option value="ALL">전체 상태</option><option value="SELLING">판매중</option><option value="PAUSED">판매중지</option><option value="OFF_SEASON">시즌 외</option></MenuSelect><MenuTextField label="메뉴 검색" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="메뉴명 또는 POS 코드" /></div>
          </Card>
          <div className="flex flex-wrap items-center justify-between gap-2 text-caption text-ink-sub"><span>전체 {menus.length}개 · 판매중 {menus.filter((menu) => menuStatus(menu).code === 'SELLING').length}개 · 조회 {visible.length}개</span><span>HOT/ICE는 각각의 POS 코드로 관리해요.</span></div>
          {error && <p role="alert" className="rounded-input bg-danger-bg p-3 text-caption text-danger">{error}</p>}
          <Card tone="line" gap="gap-0" pad="px-4 sm:px-5">
            <div className="hidden grid-cols-[minmax(0,2fr)_0.8fr_0.8fr_1fr_auto] items-center gap-3 border-b border-line py-3 text-caption text-ink-sub md:grid"><span>메뉴명 · POS 코드</span><span>카테고리</span><span className="text-right">판매가</span><span className="text-center">판매 상태</span><span>관리</span></div>
            <ul className="divide-y divide-line">{visible.map((menu) => {
              const active = openId === menu.id
              const state = menuStatus(menu)
              return <li key={menu.id} className="py-3">
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 md:grid-cols-[minmax(0,2fr)_0.8fr_0.8fr_1fr_auto]">
                  <button type="button" onClick={() => openMenu(menu)} aria-expanded={active} aria-controls={'menu-detail-' + menu.id} className="min-w-0 rounded-lg py-1 text-left focus-visible:outline-2 focus-visible:outline-woori-blue"><span className="flex flex-wrap items-center gap-1.5 text-body font-bold text-ink">{menu.name}{menu.isNew && <Pill tone="deep">NEW</Pill>}<ChevronDown size={14} className={'shrink-0 text-ink-mute ' + (active ? 'rotate-180' : '')} aria-hidden="true" /></span><span className="mt-1 block text-caption text-ink-sub">{menu.posCode ?? 'POS 미연결'}{menu.season ? ' · ' + seasonLabel(menu.season) + ' 시즌' : ''}</span></button>
                  <span className="hidden text-caption text-ink-sub md:block">{categoryOf(workspace, menu)?.name}</span>
                  <strong className="num text-right text-body text-woori-deep">{won(menu.price)}원</strong>
                  <div className="flex flex-wrap gap-1.5 md:justify-center"><Pill tone={state.tone}>{state.label}</Pill><span className="text-caption text-ink-sub md:hidden">{categoryOf(workspace, menu)?.name}</span></div>
                  <div className="flex justify-end gap-1"><button type="button" aria-label={menu.name + ' 수정'} onClick={() => edit(menu)} className="rounded-lg p-2 text-ink-sub hover:bg-surface-muted"><Pencil size={16} /></button><button type="button" aria-label={menu.name + ' 삭제'} onClick={() => { setDeleting(menu); setDeleteError('') }} className="rounded-lg p-2 text-ink-mute hover:bg-danger-bg hover:text-danger"><Trash2 size={16} /></button></div>
                </div>
                {active && <div id={'menu-detail-' + menu.id} className="mt-3 flex flex-col gap-3 rounded-input bg-surface-muted p-4">
                  <p className="text-caption text-ink-sub">{menu.note ?? '직접 등록한 메뉴'} · {menu.sizes.join(' / ') || '사이즈 미지정'} · {menu.temperatures.join(' / ') || '온도 미지정'}</p>
                  {menu.priceHistory?.map((entry) => <p key={entry.date} className="text-caption text-woori-deep">가격 이력 {entry.date.slice(0, 7)} · {won(entry.before)}원 → {won(entry.after)}원</p>)}
                  <div className="flex flex-wrap gap-2">{menu.recipe.length ? menu.recipe.map((row, index) => <span key={index} className="rounded-lg bg-white px-3 py-2 text-caption text-ink">{row.name} {won(row.quantity)}{recipeUnit(row.unit)}</span>) : <p className="text-caption text-ink-sub">등록된 레시피가 없어요.</p>}</div>
                  <div className="flex flex-wrap gap-2"><button type="button" onClick={() => edit(menu)} className="rounded-lg border border-line bg-white px-3 py-2 text-caption font-bold text-woori-deep">메뉴 수정</button><button type="button" disabled={action.isPending} onClick={() => changeSale(menu)} className="rounded-lg border border-line bg-white px-3 py-2 text-caption font-bold text-ink">{menu.onSale ? '판매중지' : '판매 재개'}</button><button type="button" onClick={() => { setDeleting(menu); setDeleteError('') }} className="rounded-lg border border-line bg-white px-3 py-2 text-caption text-danger">삭제</button></div>
                </div>}
              </li>
            })}</ul>
            {!visible.length && <p role="status" className="py-12 text-center text-label text-ink-sub">조건에 맞는 메뉴가 없어요.</p>}
          </Card>
          {workspace.sets.length > 0 && <Card tone="line"><H2>저장한 세트 구성</H2><p className="text-caption text-ink-sub">앱에서 확인한 구성안이에요. 개별 POS 메뉴와 판매 기록은 그대로 유지돼요.</p>{workspace.sets.map((set) => <div key={set.id} className="flex flex-wrap justify-between gap-2 border-t border-line pt-3"><div><p className="text-label font-bold text-ink">{set.name}</p><p className="mt-1 text-caption text-ink-sub">{set.menuIds.map((id) => workspace.menus.find((entry) => entry.id === id)?.name).join(' + ')}</p></div><strong className="num text-label text-woori-deep">{won(set.price)}원</strong></div>)}</Card>}
        </>}
        {view === 'options' && <MenuOptions workspace={workspace} />}
        {view === 'history' && <MenuHistory workspace={workspace} onEdit={edit} />}
      </>}
      <Sheet open={Boolean(editing)} onOpenChange={(open) => { if (!open && !saving) setEditing(null) }} title={editing?.id ? '메뉴 수정' : '메뉴 추가'} description="입력 중에도 기존 메뉴 목록은 유지돼요.">
        {editing && workspace && <MenuForm key={editing.id ?? 'new'} initial={editing} onBusyChange={setSaving} onSaved={() => { setEditing(null); setView('menus'); setGroup('ALL'); setCategoryId('ALL'); setStatus('ALL'); setSearch('') }} onCancel={() => { if (!saving) setEditing(null) }} />}
      </Sheet>
      <Modal open={Boolean(deleting)} onOpenChange={(open) => { if (!open) setDeleting(null) }} title="메뉴 삭제" description={(deleting?.name ?? '') + ' 메뉴를 메뉴 기록으로 이동할까요? 과거 POS 판매 기록은 유지되며 나중에 복구할 수 있어요.'} confirmLabel="삭제" tone="danger" confirmLoading={action.isPending} onConfirm={async () => {
        try { await action.mutateAsync({ type: 'DELETE_MENU', payload: { id: deleting.id } }); setDeleting(null); toast('메뉴 기록으로 이동했어요. 언제든 복구할 수 있어요.') }
        catch (err) { setDeleteError(err.message) }
      }}>{deleteError && <p role="alert" className="text-caption text-danger">{deleteError}</p>}</Modal>
    </Screen>
  )
}
