import { useState } from 'react'
import { Card, H2, Pill } from '@/components/common/ui'
import { toast } from '@/components/ui/toast'
import { useMenuActions } from '@/features/menu/queries'
import { menuStatus, seasonLabel } from '@/features/menu/menuLogic'
import { MenuSelect, MenuTextField } from './MenuFields'

export default function MenuHistory({ workspace, onEdit }) {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('ALL')
  const [error, setError] = useState('')
  const action = useMenuActions()
  const records = workspace.menus.filter((menu) => {
    const state = menuStatus(menu)
    return state.code !== 'SELLING' && (status === 'ALL' || state.code === status) && (menu.name + ' ' + (menu.posCode ?? '')).toLowerCase().includes(search.trim().toLowerCase())
  })
  const restore = async (menu) => {
    setError('')
    try {
      await action.mutateAsync({ type: menu.deletedAt ? 'RESTORE_MENU' : 'SET_SALE', payload: { id: menu.id, onSale: true } })
      toast(menu.deletedAt ? '메뉴를 복구했어요. POS 코드는 그대로 유지돼요.' : menu.season ? '시즌 판매를 준비했어요. 설정한 판매 기간에 판매중으로 표시돼요.' : '판매를 재개했어요.')
    } catch (err) { setError(err.message) }
  }
  return (
    <Card tone="line" gap="gap-4" pad="p-4 sm:p-5">
      <div><H2>메뉴 기록</H2><p className="mt-1 text-caption text-ink-sub">삭제·판매중지·시즌 외 메뉴도 기존 POS 코드와 판매 기록을 유지해요.</p></div>
      <div className="grid gap-3 sm:grid-cols-2"><MenuTextField label="메뉴 기록 검색" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="메뉴명 또는 POS 코드" /><MenuSelect label="기록 상태" value={status} onChange={(event) => setStatus(event.target.value)}><option value="ALL">전체 기록</option><option value="DELETED">삭제된 메뉴</option><option value="PAUSED">판매중지 메뉴</option><option value="OFF_SEASON">이전 시즌·시즌 외 메뉴</option></MenuSelect></div>
      {error && <p role="alert" className="text-caption text-danger">{error}</p>}
      <ul className="divide-y divide-line">{records.map((menu) => <li key={menu.id} className="flex flex-wrap items-center justify-between gap-3 py-4"><div><div className="flex flex-wrap items-center gap-2"><strong className="text-label text-ink">{menu.name}</strong><Pill tone={menuStatus(menu).tone}>{menuStatus(menu).label}</Pill></div><p className="mt-1 text-caption text-ink-sub">{menu.posCode ?? 'POS 미연결'} · 판매 기간 {seasonLabel(menu.season)}{menu.deletedAt ? ' · 삭제 ' + menu.deletedAt.slice(0, 10) : ''}</p></div><div className="flex gap-2">{!menu.deletedAt && <button type="button" onClick={() => onEdit(menu)} className="min-h-11 rounded-lg border border-line px-3 py-2 text-caption text-ink">상세·기간 수정</button>}<button type="button" disabled={action.isPending || Boolean(menu.season && menu.onSale && menu.seasonPreparedAt)} onClick={() => restore(menu)} className="min-h-11 rounded-lg bg-woori-tint px-3 py-2 text-caption font-bold text-woori-deep">{menu.deletedAt ? '복구' : menu.season && menu.onSale && menu.seasonPreparedAt ? '시즌 준비 완료' : menu.season ? '시즌 재활성화' : '판매 재개'}</button></div></li>)}</ul>
      {!records.length && <p role="status" className="py-8 text-center text-label text-ink-sub">조건에 맞는 메뉴 기록이 없어요.</p>}
    </Card>
  )
}
