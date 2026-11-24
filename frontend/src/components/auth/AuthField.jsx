import { useId, useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'

export default function AuthField({ label, error, hint, right, type = 'text', id: suppliedId, ...props }) {
  const generatedId = useId()
  const id = suppliedId ?? generatedId
  const [visible, setVisible] = useState(false)
  return (
    <div className="min-w-0 space-y-1.5">
      <label htmlFor={id} className="block text-label font-bold text-ink">{label}</label>
      <div className="flex items-start gap-2">
        <div className="relative min-w-0 flex-1">
          <input
            {...props} id={id} type={type === 'password' && visible ? 'text' : type}
            aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
            className={`h-11 w-full min-w-0 rounded-input border bg-surface-muted px-3 text-body text-ink outline-none transition focus:border-woori-blue focus:ring-2 focus:ring-woori-blue/20 disabled:opacity-60 ${type === 'password' ? 'pr-11' : ''} ${error ? 'border-danger' : 'border-transparent'}`}
          />
          {type === 'password' && (
            <button type="button" aria-label={`${label} ${visible ? '숨기기' : '표시'}`} aria-pressed={visible} onClick={() => setVisible((value) => !value)} className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-input text-ink-sub">
              {visible ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
            </button>
          )}
        </div>
        {right && <div className="w-24 shrink-0">{right}</div>}
      </div>
      {error ? <p id={`${id}-error`} role="alert" className="text-caption text-danger">{error}</p> : hint ? <p id={`${id}-hint`} className="text-caption text-ink-sub">{hint}</p> : null}
    </div>
  )
}
