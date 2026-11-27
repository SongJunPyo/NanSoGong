import { useRef, useState } from 'react'
import { CalendarDays } from 'lucide-react'
import { Modal } from '@/components/ui/modal'
import { formatSalesDate, salesDateRangeLabel } from '@/features/sales/analytics'

export default function SalesDateRange({ range, onChange, availableFrom, availableTo }) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState(range)
  const trigger = useRef(null)
  const error = !draft.from || !draft.to ? '시작일과 종료일을 모두 선택해 주세요.'
    : draft.from > draft.to ? '종료일은 시작일보다 빠를 수 없어요.'
      : draft.from < availableFrom || draft.to > availableTo ? '조회 가능한 기간 안에서 선택해 주세요.' : ''

  const changeOpen = (next) => {
    if (next) setDraft(range)
    setOpen(next)
    if (!next) requestAnimationFrame(() => trigger.current?.focus())
  }

  return (
    <>
      <button
        ref={trigger}
        type="button"
        aria-haspopup="dialog"
        onClick={() => changeOpen(true)}
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-input border border-line bg-white px-3 text-label font-bold text-ink hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-woori-blue"
      >
        <CalendarDays size={16} aria-hidden="true" />
        기간 지정 <span className="font-medium text-ink-sub">{salesDateRangeLabel(range)}</span>
      </button>
      <Modal
        open={open}
        onOpenChange={changeOpen}
        title="조회 기간 지정"
        description={`조회 가능한 기간: ${formatSalesDate(availableFrom, true)} – ${formatSalesDate(availableTo, true)}`}
        confirmLabel="적용하기"
        confirmDisabled={Boolean(error)}
        onConfirm={() => {
          if (error) return
          onChange({ ...draft })
          changeOpen(false)
        }}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          {[['from', '시작일'], ['to', '종료일']].map(([key, label]) => (
            <label key={key} className="flex min-w-0 flex-col gap-2 text-label font-medium text-ink">
              {label}
              <input
                type="date"
                value={draft[key]}
                min={availableFrom}
                max={availableTo}
                aria-invalid={Boolean(error)}
                aria-describedby={error ? 'sales-range-error' : undefined}
                onChange={(event) => setDraft({ ...draft, [key]: event.target.value })}
                className="h-12 w-full min-w-0 rounded-input border border-line bg-surface-muted px-3 text-label outline-none focus:ring-2 focus:ring-woori-blue"
              />
            </label>
          ))}
        </div>
        {error && <p id="sales-range-error" role="alert" className="text-caption text-danger">{error}</p>}
        <p className="text-caption text-ink-sub">선택한 기간이 매출 요약과 시간대·날짜 그래프에 함께 적용돼요.</p>
      </Modal>
    </>
  )
}
