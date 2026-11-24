import { Dialog } from 'radix-ui'
import { X } from 'lucide-react'
import { ButtonLoading } from './loading'

/**
 * 가운데 대화 창 — 🚨 돈이 나가거나 동의를 받을 때만 쓴다 (결제 직전 확정, 재승인 등)
 *   끝난 일은 toast, 되돌릴 수 있는 일은 toast(…, { undo }), 고르기는 Sheet 를 쓴다
 *
 * 다크 패턴 금지: 확인 · 취소 버튼은 같은 크기, 취소 문구에 죄책감을 주는 말 쓰지 않기
 *
 * @param {boolean} open · onOpenChange  열림 상태 (부모가 관리)
 * @param {Function} onConfirm  확인 — 결제 · 동의는 이 버튼으로만 확정된다
 * @param {boolean} confirmLoading  처리 중이면 확인 버튼이 ButtonLoading 으로 바뀌고 창이 닫히지 않는다
 */
export function Modal({
  open,
  onOpenChange,
  title,
  description,
  children,
  confirmLabel = '확인',
  cancelLabel = '취소',
  onConfirm,
  confirmLoading = false,
  confirmDisabled = false,
  tone = 'primary',
}) {
  const change = (next) => {
    if (confirmLoading) return
    onOpenChange?.(next)
  }

  return (
    <Dialog.Root open={open} onOpenChange={change}>
      <Dialog.Portal>
        <Dialog.Overlay className="animate-fade-in fixed inset-0 z-[60] bg-black/45" />
        <Dialog.Content
          className="animate-toast-top fixed top-1/2 left-1/2 z-[60] flex max-h-[85dvh] w-[calc(100vw-40px)] max-w-[420px] -translate-x-1/2 -translate-y-1/2 flex-col gap-4 overflow-y-auto rounded-card bg-white p-6 shadow-xl outline-none"
          onInteractOutside={(e) => confirmLoading && e.preventDefault()}
        >
          <div className="flex items-start gap-2">
            <Dialog.Title className="flex-1 text-h2 font-bold text-ink">{title}</Dialog.Title>
            <Dialog.Close
              aria-label="닫기"
              disabled={confirmLoading}
              className="-m-1 rounded-md p-1.5 text-ink-mute hover:bg-surface-muted hover:text-ink"
            >
              <X size={20} />
            </Dialog.Close>
          </div>
          {description ? (
            <Dialog.Description className="text-label text-ink-sub">{description}</Dialog.Description>
          ) : (
            <Dialog.Description className="sr-only">{title}</Dialog.Description>
          )}
          {children}
          <div className="mt-1 grid grid-cols-2 gap-2">
            <Dialog.Close
              disabled={confirmLoading}
              className="h-[52px] rounded-button border border-line bg-white text-base font-bold text-ink disabled:opacity-50"
            >
              {cancelLabel}
            </Dialog.Close>
            <ButtonLoading
              variant={tone === 'danger' ? 'danger' : 'primary'}
              loading={confirmLoading}
              loadingText="처리 중"
              disabled={confirmDisabled}
              onClick={onConfirm}
            >
              {confirmLabel}
            </ButtonLoading>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
