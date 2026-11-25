import { CircleAlert } from 'lucide-react'

/**
 * 입력 칸 바로 아래 빨간 안내 — 웹 · 앱 같은 모습
 *   입력 칸에는 aria-invalid 와 aria-describedby={id} 를 함께 준다
 *   <input aria-invalid={!!error} aria-describedby="qty-error" />
 *   <InlineError id="qty-error">{error}</InlineError>
 * children 이 비어 있으면 아무것도 그리지 않는다
 */
export function InlineError({ id, children }) {
  if (!children) return null
  return (
    <p id={id} role="alert" className="mt-1.5 flex items-start gap-1.5 text-caption font-medium text-danger">
      <CircleAlert size={14} className="mt-px shrink-0" aria-hidden="true" />
      <span>{children}</span>
    </p>
  )
}
