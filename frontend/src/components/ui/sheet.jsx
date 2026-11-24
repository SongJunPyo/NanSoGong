import { Dialog } from 'radix-ui'
import { X } from 'lucide-react'
import { useIsDesktop } from '@/hooks/useViewport'

const cx = (...a) => a.filter(Boolean).join(' ')

/**
 * 고르기 · 짧은 입력 창 (반려 사유, 정정 요청, 같이 담기 …)
 *   앱: 화면 아래에서 올라오는 바텀시트 (스프링 애니메이션, 위쪽 손잡이)
 *   웹: 가운데 창으로 표시 (넓은 화면에서 바텀시트는 손이 멀다)
 * 돈 · 동의를 확정하는 창은 Sheet 가 아니라 Modal 을 쓴다
 *
 * @param {React.ReactNode} footer  아래 고정 버튼 줄 (스크롤해도 보임)
 */
export function Sheet({ open, onOpenChange, title, description, children, footer }) {
  const desktop = useIsDesktop()

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="animate-fade-in fixed inset-0 z-[60] bg-black/45" />
        <Dialog.Content
          className={cx(
            'fixed z-[60] flex flex-col bg-white shadow-xl outline-none',
            desktop
              ? 'animate-toast-top top-1/2 left-1/2 max-h-[80dvh] w-[480px] -translate-x-1/2 -translate-y-1/2 rounded-card'
              : 'animate-sheet-in inset-x-0 bottom-0 max-h-[88dvh] rounded-t-[20px] pb-[env(safe-area-inset-bottom)]',
          )}
        >
          {!desktop && <span aria-hidden="true" className="mx-auto mt-2.5 h-1 w-10 shrink-0 rounded-full bg-line" />}
          <div className="flex items-start gap-2 px-5 pt-4 pb-2 lg:px-6 lg:pt-6">
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <Dialog.Title className="text-h2 font-bold text-ink">{title}</Dialog.Title>
              {description ? (
                <Dialog.Description className="text-label text-ink-sub">{description}</Dialog.Description>
              ) : (
                <Dialog.Description className="sr-only">{title}</Dialog.Description>
              )}
            </div>
            <Dialog.Close aria-label="닫기" className="-m-1 rounded-md p-1.5 text-ink-mute hover:bg-surface-muted hover:text-ink">
              <X size={20} />
            </Dialog.Close>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-2 lg:px-6">{children}</div>
          {footer && <div className="flex gap-2 px-5 pt-3 pb-5 lg:px-6 lg:pb-6 [&>*]:flex-1">{footer}</div>}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

/** Sheet 안의 라디오 목록 (반려 사유 등) — 아무것도 미리 고르지 않은 상태로 시작한다 */
export function SheetRadioList({ name, options, value, onChange }) {
  return (
    <div role="radiogroup" className="flex flex-col">
      {options.map((opt) => {
        const { value: v, label } = typeof opt === 'string' ? { value: opt, label: opt } : opt
        const on = value === v
        return (
          <label key={v} className="flex min-h-[52px] cursor-pointer items-center gap-3 border-b border-line last:border-b-0">
            <input type="radio" name={name} value={v} checked={on} onChange={() => onChange(v)} className="peer sr-only" />
            <span
              aria-hidden="true"
              className={cx(
                'flex size-5 shrink-0 items-center justify-center rounded-full border-2 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-woori-blue',
                on ? 'border-woori-deep' : 'border-line',
              )}
            >
              {on && <span className="size-2.5 rounded-full bg-woori-deep" />}
            </span>
            <span className={cx('text-body', on ? 'font-bold text-ink' : 'text-ink')}>{label}</span>
          </label>
        )
      })}
    </div>
  )
}
