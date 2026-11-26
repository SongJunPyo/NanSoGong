import { Link, useLocation } from 'react-router-dom'
import { SALES_TAB_LABELS, SALES_TABS } from '@/features/sales/constants'

/** 기존 /sales 주소를 유지하는 매출 영역 전용 탭. */
export default function SalesTabs() {
  const { pathname } = useLocation()
  const active = pathname.startsWith('/sales/costs') ? 1 : pathname.startsWith('/sales/promotions') ? 2 : 0

  return (
    <nav aria-label="매출 화면" className="mx-auto w-full max-w-xl">
      <div className="grid grid-cols-3 gap-1 rounded-input bg-surface-muted p-1">
        {SALES_TAB_LABELS.map((label, index) => (
          <Link
            key={label}
            to={SALES_TABS[index]}
            aria-current={active === index ? 'page' : undefined}
            className={`min-w-0 rounded-[9px] px-1 py-2.5 text-center text-[12px] whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-woori-blue sm:text-label ${
              active === index ? 'bg-white font-bold text-woori-deep shadow-sm' : 'font-medium text-ink-sub hover:text-ink'
            }`}
          >
            {label}
          </Link>
        ))}
      </div>
    </nav>
  )
}
