import { Link, useLocation } from 'react-router-dom'
import { SALES_TAB_LABELS, SALES_TABS } from '@/features/sales/constants'

/** 기존 /sales 주소를 유지하는 매출 영역 전용 탭. */
export default function SalesTabs() {
  const { pathname } = useLocation()
  const active = pathname.startsWith('/sales/costs') ? 1 : pathname.startsWith('/sales/promotions') ? 2 : 0

  return (
    <nav aria-label="매출 화면" className="sticky top-[60px] z-10 -mx-screen bg-white px-screen py-2 md:-mx-6 md:px-6 lg:top-20 lg:-mx-8 lg:px-8">
      <div className="mx-auto grid w-full max-w-xl grid-cols-3 gap-1 rounded-input bg-surface-muted p-1">
        {SALES_TAB_LABELS.map((label, index) => (
          <Link
            key={label}
            to={SALES_TABS[index]}
            aria-current={active === index ? 'page' : undefined}
            className={`flex min-h-11 min-w-0 items-center justify-center rounded-[9px] px-1 text-center text-[12px] whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-woori-blue sm:text-label ${
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
