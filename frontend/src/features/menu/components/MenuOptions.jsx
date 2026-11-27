import { useRef, useState } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { Card, H2, Pill } from '@/components/common/ui'
import { Sheet } from '@/components/ui/sheet'
import { Modal } from '@/components/ui/modal'
import { ButtonLoading } from '@/components/ui/loading'
import { toast } from '@/components/ui/toast'
import { useMenuActions } from '@/features/menu/queries'
import { previewOptions, recipeUnit, validateOption } from '@/features/menu/menuLogic'
import { won } from '@/lib/format'
import { MenuPriceField, MenuSelect, MenuTextField } from './MenuFields'
import RecipeEditor from './RecipeEditor'

export default function MenuOptions({ workspace }) {
  const [editing, setEditing] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [error, setError] = useState('')
  const [menuId, setMenuId] = useState('americano-hot')
  const [selected, setSelected] = useState([])
  const [operationId, setOperationId] = useState('')
  const lock = useRef(false)
  const action = useMenuActions()
  const options = workspace.options.filter((option) => !option.deletedAt)
  const menus = workspace.menus.filter((menu) => !menu.deletedAt)
  const menu = menus.find((entry) => entry.id === menuId) ?? menus[0]
  const applicable = options.filter((option) => !option.needsConfirmation && option.menuIds.includes(menu?.id))
  const preview = menu ? previewOptions(menu, applicable.filter((option) => selected.includes(option.id))) : null
  const edit = (option) => { setEditing(structuredClone(option ?? { name: '', code: '', price: 0, menuIds: [], recipe: [] })); setError(''); setOperationId(crypto.randomUUID()) }
  const update = (changes) => setEditing((current) => ({ ...current, ...changes }))
  const save = async (event) => {
    event.preventDefault()
    if (lock.current) return
    const message = validateOption(editing, workspace)
    if (message) { setError(message); return }
    lock.current = true; setError('')
    try { await action.mutateAsync({ type: 'SAVE_OPTION', payload: editing, operationId }); setEditing(null); toast('옵션을 저장했어요.') }
    catch (err) { setError(err.message) }
    finally { lock.current = false }
  }
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><H2>옵션 관리</H2><p className="mt-1 text-caption text-ink-sub">옵션 금액·적용 메뉴·레시피 증감량을 함께 관리해요.</p></div><button type="button" onClick={() => edit()} className="inline-flex min-h-11 items-center gap-1 rounded-input bg-woori-deep px-4 text-label font-bold text-white"><Plus size={16} aria-hidden="true" />옵션 추가</button></div>
      <div className="grid gap-3 md:grid-cols-2">
        {options.map((option) => <Card key={option.id} tone="line" gap="gap-3" pad="p-4">
          <div className="flex items-start justify-between gap-2"><div><p className="text-caption text-ink-sub">{option.code}</p><h3 className="mt-1 text-body font-bold text-ink">{option.name}</h3></div><p className="num text-body font-bold text-woori-blue">{won(option.price, true)}원</p></div>
          <p className="text-caption text-ink-sub">{option.menuIds.length ? option.menuIds.map((id) => workspace.menus.find((entry) => entry.id === id)?.posCode ?? '미연결 메뉴').join(' · ') : option.targetNote}</p>
          {option.needsConfirmation && <Pill tone="amber">적용 대상 확인 필요</Pill>}
          <div className="rounded-input bg-surface-muted p-3 text-caption text-ink">{option.recipe.map((row, index) => <p key={index}>{row.name} {won(row.quantity, true)}{recipeUnit(row.unit)}</p>)}</div>
          <div className="flex justify-end gap-2"><button type="button" aria-label={option.name + ' 옵션 수정'} onClick={() => edit(option)} className="inline-flex min-h-11 items-center gap-1 rounded-lg border border-line px-3 py-2 text-caption text-ink"><Pencil size={13} />수정</button><button type="button" aria-label={option.name + ' 옵션 삭제'} onClick={() => { setDeleting(option); setError('') }} className="inline-flex min-h-11 items-center gap-1 rounded-lg border border-line px-3 py-2 text-caption text-danger"><Trash2 size={13} />삭제</button></div>
        </Card>)}
      </div>
      <Card tone="line" gap="gap-4" pad="p-4 sm:p-5">
        <H2>옵션 적용 미리보기</H2>
        {menu ? <>
          <MenuSelect label="기본 메뉴" value={menu.id} onChange={(event) => { setMenuId(event.target.value); setSelected([]) }}>{menus.map((entry) => <option key={entry.id} value={entry.id}>{entry.name} · {entry.posCode ?? 'POS 미연결'}</option>)}</MenuSelect>
          <div className="flex flex-wrap gap-3">{applicable.length ? applicable.map((option) => <label key={option.id} className="flex min-h-11 items-center gap-2 text-label text-ink"><input type="checkbox" checked={selected.includes(option.id)} onChange={() => setSelected((current) => current.includes(option.id) ? current.filter((id) => id !== option.id) : [...current, option.id])} className="accent-woori-deep" />{option.name} (+{won(option.price)}원)</label>) : <p className="text-caption text-ink-sub">적용 대상이 확인된 옵션이 없어요.</p>}</div>
          <div className="flex items-center justify-between rounded-input bg-woori-tint p-4"><span className="text-label text-ink-sub">기본 메뉴 + 선택 옵션</span><strong className="num text-xl text-woori-deep">{won(preview.price)}원</strong></div>
          {preview.error ? <p role="alert" className="text-caption text-danger">{preview.error}</p> : <div className="flex flex-wrap gap-2">{preview.recipe.map((row, index) => <span key={index} className="rounded-lg bg-surface-muted px-3 py-2 text-caption text-ink">{row.name} {won(row.quantity)}{recipeUnit(row.unit)}</span>)}</div>}
        </> : <p className="text-caption text-ink-sub">미리 볼 메뉴가 없어요.</p>}
      </Card>
      <Sheet open={Boolean(editing)} onOpenChange={(open) => { if (!open && !action.isPending) setEditing(null) }} title={editing?.id ? '옵션 수정' : '옵션 추가'} description="한 옵션을 여러 메뉴에 연결할 수 있어요.">
        {editing && <form onSubmit={save} noValidate className="flex flex-col gap-4 pb-3">
          <MenuTextField label="옵션명" value={editing.name} onChange={(event) => update({ name: event.target.value })} />
          <div className="grid grid-cols-2 gap-3"><MenuTextField label="옵션 코드" value={editing.code} readOnly={Boolean(editing.id)} onChange={(event) => update({ code: event.target.value })} /><MenuPriceField label="추가 금액" value={editing.price} onChange={(price) => update({ price })} /></div>
          <fieldset><legend className="mb-2 text-caption font-bold text-ink">적용 메뉴 (복수 선택)</legend><div className="grid max-h-52 gap-2 overflow-y-auto rounded-input border border-line p-3">{workspace.menus.filter((entry) => !entry.deletedAt || editing.menuIds.includes(entry.id)).map((entry) => <label key={entry.id} className="flex min-h-11 items-center gap-2 text-caption text-ink"><input type="checkbox" checked={editing.menuIds.includes(entry.id)} onChange={() => update({ menuIds: editing.menuIds.includes(entry.id) ? editing.menuIds.filter((id) => id !== entry.id) : [...editing.menuIds, entry.id] })} className="accent-woori-deep" />{entry.posCode ?? '미연결'} · {entry.name}{entry.deletedAt ? ' (삭제됨 · 연결 해제 필요)' : ''}</label>)}</div></fieldset>
          <h3 className="text-label font-bold text-ink">레시피 변경</h3><RecipeEditor delta recipe={editing.recipe} onChange={(recipe) => update({ recipe })} />
          {error && <p role="alert" className="text-caption text-danger">{error}</p>}
          <div className="grid grid-cols-2 gap-2"><button type="button" disabled={action.isPending} onClick={() => setEditing(null)} className="rounded-input border border-line text-label font-bold text-ink">취소</button><ButtonLoading type="submit" loading={action.isPending} loadingText="저장 중...">옵션 저장</ButtonLoading></div>
        </form>}
      </Sheet>
      <Modal open={Boolean(deleting)} onOpenChange={(open) => { if (!open) setDeleting(null) }} title="옵션 삭제" description={(deleting?.name ?? '') + ' 옵션을 목록에서 삭제할까요? 기존 메뉴 레시피는 변경되지 않아요.'} confirmLabel="삭제" confirmLoading={action.isPending} tone="danger" onConfirm={async () => {
        try { await action.mutateAsync({ type: 'DELETE_OPTION', payload: { id: deleting.id } }); setDeleting(null); toast('옵션을 삭제했어요.') }
        catch (err) { setError(err.message) }
      }}>{error && !editing && <p role="alert" className="text-caption text-danger">{error}</p>}</Modal>
    </div>
  )
}
