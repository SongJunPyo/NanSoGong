import { Link, useLocation } from 'react-router-dom'

const TABS = [
  { label: '재고 관리', to: '/inventory' },
  { label: '발주 목록', to: '/orders' },
  { label: '입고 확인', to: '/receiving' },
]

/** 재고 세 화면 공통 탭 — 메뉴 화면(MenuTabs)과 같은 모양, 스크롤해도 헤더 바로 아래에 고정 */
export default function InventoryTabs() {
  const { pathname } = useLocation()
  return (
    <nav
      aria-label="재고 화면"
      className="sticky top-[60px] z-10 -mx-screen bg-white px-screen py-2 md:-mx-6 md:px-6 lg:top-20 lg:-mx-8 lg:px-8"
    >
      <div className="mx-auto flex max-w-xl gap-1 rounded-input bg-surface-muted p-1">
        {TABS.map((t) => {
          const on = pathname === t.to
          return (
            <Link
              key={t.to}
              to={t.to}
              replace
              aria-current={on ? 'page' : undefined}
              className={`flex-1 rounded-[9px] py-[9px] text-center text-label ${
                on ? 'bg-white font-bold text-woori-deep shadow-sm' : 'font-medium text-ink-sub'
              }`}
            >
              {t.label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
