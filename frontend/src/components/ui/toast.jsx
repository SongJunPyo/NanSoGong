import { useEffect } from 'react'
import { create } from 'zustand'
import { CircleAlert, CircleCheck, X } from 'lucide-react'
import { useIsDesktop } from '@/hooks/useViewport'

const cx = (...a) => a.filter(Boolean).join(' ')

// 끝난 일은 토스트, 되돌릴 수 있는 일은 [되돌리기] 가 붙은 토스트로 알린다
// 되돌리기가 있으면 누를 시간을 더 준다
const DURATION = 3000
const UNDO_DURATION = 6000
const MAX_VISIBLE = 3

let nextId = 1

const useToastStore = create((set) => ({
  toasts: [],
  add: (t) => set((s) => ({ toasts: [...s.toasts, t].slice(-MAX_VISIBLE) })),
  remove: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}))

/**
 * 토스트 띄우기 — 컴포넌트 밖(mutation onSuccess 등)에서도 부를 수 있다
 *   toast('발주를 보냈어요')
 *   toast('우유를 뺐어요', { undo: () => restore('milk') })
 *   toast('저장하지 못했어요', { tone: 'error' })
 * @returns 토스트 id (toast.dismiss(id) 로 닫기)
 */
export function toast(message, { undo, undoLabel = '되돌리기', tone = 'success', duration } = {}) {
  const id = nextId++
  useToastStore.getState().add({
    id,
    message,
    undo,
    undoLabel,
    tone,
    duration: duration ?? (undo ? UNDO_DURATION : DURATION),
  })
  return id
}
toast.dismiss = (id) => useToastStore.getState().remove(id)

function ToastItem({ t, desktop }) {
  const remove = useToastStore((s) => s.remove)

  useEffect(() => {
    const timer = setTimeout(() => remove(t.id), t.duration)
    return () => clearTimeout(timer)
  }, [t.id, t.duration, remove])

  const Icon = t.tone === 'error' ? CircleAlert : CircleCheck

  return (
    <div
      role={t.tone === 'error' ? 'alert' : 'status'}
      className={cx(
        'pointer-events-auto flex min-h-[52px] w-full items-center gap-2.5 rounded-input px-4 py-3 shadow-lg',
        desktop ? 'animate-toast-top border border-line bg-white text-ink' : 'animate-toast-bottom bg-ink text-white',
      )}
    >
      <Icon
        size={20}
        aria-hidden="true"
        className={cx('shrink-0', t.tone === 'error' ? 'text-danger' : desktop ? 'text-success' : 'text-[#7fd6b0]')}
      />
      <p className="min-w-0 flex-1 text-label font-medium">{t.message}</p>
      {t.undo && (
        <button
          type="button"
          onClick={() => {
            t.undo()
            remove(t.id)
          }}
          className={cx(
            'shrink-0 rounded-lg px-2 py-1.5 text-label font-bold focus-visible:outline-2 focus-visible:outline-woori-sky',
            desktop ? 'text-woori-blue hover:bg-woori-tint' : 'text-woori-sky',
          )}
        >
          {t.undoLabel}
        </button>
      )}
      {desktop && (
        <button
          type="button"
          aria-label="알림 닫기"
          onClick={() => remove(t.id)}
          className="shrink-0 rounded-md p-1 text-ink-mute hover:bg-surface-muted hover:text-ink"
        >
          <X size={16} />
        </button>
      )}
    </div>
  )
}

/**
 * 토스트가 그려지는 자리 — AppRouter 에 한 번만 둔다
 *   웹: 오른쪽 위 / 앱: 화면 아래 스낵바 (하단 탭바 위)
 */
export function Toaster() {
  const toasts = useToastStore((s) => s.toasts)
  const desktop = useIsDesktop()

  return (
    <div
      aria-live="polite"
      className={cx(
        'pointer-events-none fixed z-[70] flex flex-col gap-2',
        desktop
          ? 'top-6 right-6 w-[360px]'
          : 'inset-x-3 bottom-[calc(96px+env(safe-area-inset-bottom))] mx-auto max-w-md flex-col-reverse',
      )}
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} t={t} desktop={desktop} />
      ))}
    </div>
  )
}
