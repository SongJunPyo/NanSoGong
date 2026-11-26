import { Link, useLocation } from 'react-router-dom'
import { SALES_TAB_LABELS, SALES_TABS } from '@/features/sales/constants'

/** 매출 메인에서는 본문만 바꾸고, 기존 상세 주소에서는 매출의 해당 탭으로 연결한다. */
export default function SalesTabs({ value, onChange }) {
  const { pathname } = useLocation()
  const active = value ?? (pathname.startsWith('/sales/costs') ? 1 : pathname.startsWith('/sales/promotions') ? 2 : 0)
  const changeWithKeyboard = (event, index) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
    event.preventDefault()
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? SALES_TAB_LABELS.length - 1
      : (index + (event.key === 'ArrowRight' ? 1 : -1) + SALES_TAB_LABELS.length) % SALES_TAB_LABELS.length
    onChange(next)
    event.currentTarget.parentElement.querySelectorAll('[role="tab"]')[next].focus()
  }

  return (
    <nav aria-label="매출 화면" className="sticky top-[60px] z-10 mx-auto w-full max-w-xl bg-white py-2 lg:top-20">
      <div role={onChange ? 'tablist' : undefined} aria-label={onChange ? '매출 구분' : undefined} className="grid grid-cols-3 gap-1 rounded-input bg-surface-muted p-1">
        {SALES_TAB_LABELS.map((label, index) => {
          const className = `min-w-0 rounded-[9px] px-1 py-2.5 text-center text-[12px] whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-woori-blue sm:text-label ${
            active === index ? 'bg-white font-bold text-woori-deep shadow-sm' : 'font-medium text-ink-sub hover:text-ink'
          }`
          return onChange ? (
            <button
              key={label} type="button" role="tab" id={`sales-tab-${index}`}
              aria-selected={active === index} aria-controls={`sales-panel-${index}`}
              tabIndex={active === index ? 0 : -1}
              onClick={() => onChange(index)} onKeyDown={(event) => changeWithKeyboard(event, index)}
              className={className}
            >
              {label}
            </button>
          ) : (
            <Link key={label} to={SALES_TABS[0]} state={{ salesTab: index }} aria-current={active === index ? 'page' : undefined} className={className}>
              {label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
