import { Plus, Trash2 } from 'lucide-react'
import { useInventory } from '@/features/inventory/queries'
import { UNITS } from '@/features/menu/menuLogic'

/** 재고는 기존 조회 훅으로만 읽는다. 메뉴 레시피를 편집해도 재고 데이터는 변경하지 않는다. */
export default function RecipeEditor({ recipe, onChange, delta = false }) {
  const { data: inventory = [] } = useInventory()
  const update = (index, changes) => onChange(recipe.map((row, position) => position === index ? { ...row, ...changes } : row))
  const inputClass = 'h-10 w-full min-w-0 rounded-lg border border-line bg-white px-2 text-caption text-ink outline-none focus:ring-2 focus:ring-woori-blue'
  return (
    <div className="flex flex-col gap-3">
      {recipe.length === 0 && <p className="rounded-input bg-surface-muted p-4 text-caption text-ink-sub">아직 재료가 없어요. 재료를 추가하거나 레시피 추천을 받아보세요.</p>}
      {recipe.map((row, index) => (
        <fieldset key={index} className="min-w-0 rounded-input bg-surface-muted p-3">
          <legend className="sr-only">재료 {index + 1}</legend>
          <div className="grid grid-cols-[minmax(0,1fr)_4rem_3.5rem_1.5rem] items-end gap-1.5">
            <label className="min-w-0 text-[11px] text-ink-sub">재료명<input aria-label={'재료 ' + (index + 1) + ' 이름'} value={row.name} onChange={(event) => update(index, { name: event.target.value, itemId: null })} className={inputClass} /></label>
            <label className="min-w-0 text-[11px] text-ink-sub">{delta ? '증감량' : '사용량'}<input aria-label={'재료 ' + (index + 1) + ' 수량'} type="number" step="0.001" min={delta ? undefined : '0.001'} value={row.quantity} onChange={(event) => update(index, { quantity: event.target.value })} className={inputClass} /></label>
            <label className="min-w-0 text-[11px] text-ink-sub">단위<select aria-label={'재료 ' + (index + 1) + ' 단위'} value={row.unit} onChange={(event) => update(index, { unit: event.target.value })} className={inputClass}>{UNITS.map((unit) => <option key={unit.value} value={unit.value}>{unit.label}</option>)}</select></label>
            <button type="button" aria-label={'재료 ' + (index + 1) + ' 삭제'} onClick={() => onChange(recipe.filter((_, position) => position !== index))} className="flex h-10 items-center justify-center rounded-lg text-ink-mute hover:text-danger focus-visible:outline-2 focus-visible:outline-woori-blue"><Trash2 size={16} /></button>
          </div>
          <label className="mt-2 flex items-center gap-2 text-[11px] text-ink-sub"><span className="shrink-0">재고 품목 연결</span><select aria-label={'재료 ' + (index + 1) + ' 재고 품목'} value={row.itemId ?? ''} onChange={(event) => {
            const item = inventory.find((entry) => entry.id === event.target.value)
            update(index, { itemId: item?.id ?? null, ...(item ? { name: item.name } : {}) })
          }} className="h-8 min-w-0 flex-1 rounded-md border border-line bg-white px-2 text-caption text-ink"><option value="">직접 입력 · 미연결</option>{inventory.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        </fieldset>
      ))}
      <button type="button" onClick={() => onChange([...recipe, { name: '', quantity: '', unit: 'G', itemId: null }])} className="inline-flex min-h-10 items-center justify-center gap-1 rounded-input border border-dashed border-woori-blue/40 px-3 text-label font-bold text-woori-blue focus-visible:outline-2 focus-visible:outline-woori-blue"><Plus size={16} aria-hidden="true" />재료 추가</button>
      {delta && <p className="text-caption text-ink-sub">기본 레시피에서 뺄 재료는 음수, 더할 재료는 양수로 입력해 주세요.</p>}
    </div>
  )
}
