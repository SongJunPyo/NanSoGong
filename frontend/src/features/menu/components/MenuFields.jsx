import { useId, useState } from 'react'
import { Plus } from 'lucide-react'
import { won } from '@/lib/format'
import { useMenuActions } from '@/features/menu/queries'
import { ButtonLoading } from '@/components/ui/loading'

const inputStyle = 'h-11 w-full min-w-0 rounded-input border border-line bg-surface-muted px-3 text-label text-ink outline-none focus:ring-2 focus:ring-woori-blue disabled:opacity-60'

export function MenuTextField({ label, ...props }) {
  return <label className="flex min-w-0 flex-col gap-1.5 text-caption font-medium text-ink-sub"><span>{label}</span><input className={inputStyle} {...props} /></label>
}

export function MenuSelect({ label, children, ...props }) {
  return <label className="flex min-w-0 flex-col gap-1.5 text-caption font-medium text-ink-sub"><span>{label}</span><select className={inputStyle} {...props}>{children}</select></label>
}

export function MenuPriceField({ label = '판매가', value, onChange, ...props }) {
  return (
    <label className="flex min-w-0 flex-col gap-1.5 text-caption font-medium text-ink-sub">
      <span>{label}</span>
      <span className="flex items-center gap-2 rounded-input border border-line bg-surface-muted pr-3 focus-within:ring-2 focus-within:ring-woori-blue">
        <input {...props} inputMode="numeric" value={value === '' ? '' : won(Number(value))} onChange={(event) => {
          const text = event.target.value
          if (!/^[\d,]*$/.test(text)) return
          const digits = text.replaceAll(',', '')
          if (digits.length > 9) return
          onChange(digits === '' ? '' : Number(digits))
        }} className="num h-11 w-full min-w-0 bg-transparent px-3 text-label text-ink outline-none" />
        <span>원</span>
      </span>
    </label>
  )
}

export function CategoryCreator({ onAdded }) {
  const panelId = useId()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [parent, setParent] = useState('DRINK')
  const [error, setError] = useState('')
  const action = useMenuActions()
  const save = async () => {
    if (action.isPending) return
    setError('')
    try {
      const response = await action.mutateAsync({ type: 'ADD_CATEGORY', payload: { name, parent } })
      onAdded?.(response.result.id)
      setName(''); setOpen(false)
    } catch (err) { setError(err.message) }
  }
  return (
    <div>
      <button type="button" aria-expanded={open} aria-controls={open ? panelId : undefined} onClick={() => setOpen(!open)} className="inline-flex min-h-11 items-center gap-1 rounded-lg px-2 text-label font-bold text-woori-deep focus-visible:outline-2 focus-visible:outline-woori-blue"><Plus size={16} aria-hidden="true" />카테고리 추가</button>
      {open && <div id={panelId} className="mt-2 flex flex-col gap-3 rounded-input border border-line bg-woori-tint p-3" onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); save() } }}>
        <div className="grid grid-cols-2 gap-2"><MenuTextField label="새 카테고리명" value={name} maxLength={20} onChange={(event) => setName(event.target.value)} placeholder="예: 스무디" /><MenuSelect label="상위 분류" value={parent} onChange={(event) => setParent(event.target.value)}><option value="DRINK">음료</option><option value="FOOD">푸드</option></MenuSelect></div>
        {error && <p role="alert" className="text-caption text-danger">{error}</p>}
        <div className="flex gap-2"><button type="button" onClick={() => setOpen(false)} className="min-h-11 flex-1 rounded-input border border-line bg-white p-2 text-label text-ink">취소</button><ButtonLoading className="min-h-11 flex-1 text-label" full={false} loading={action.isPending} loadingText="등록 중..." onClick={save}>카테고리 등록</ButtonLoading></div>
      </div>}
    </div>
  )
}
