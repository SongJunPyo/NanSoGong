import { Link, useLocation } from 'react-router-dom'

const TABS = [
  { label: '메뉴 관리', to: '/menu' },
  { label: '판매 분석', to: '/menu/analysis' },
  { label: 'AI 추천', to: '/menu/recommendations' },
]

/** 메뉴 세 화면 공통 탭 — 스크롤해도 헤더 바로 아래에 고정 */
export default function MenuTabs() {
  const { pathname } = useLocation()
  return (
    <nav
      aria-label="메뉴 화면"
      className="sticky top-[60px] z-10 -mx-screen bg-white px-screen py-2 md:-mx-6 md:px-6 lg:top-20 lg:-mx-8 lg:px-8"
    >
      <div className="mx-auto flex max-w-xl gap-1 rounded-input bg-surface-muted p-1">
        {TABS.map((t) => {
          const on = t.to === '/menu' ? pathname === '/menu' || /^\/menu\/[^/]+\/edit$/.test(pathname) : pathname === t.to || pathname.startsWith(t.to + '/')
          return (
            <Link
              key={t.to}
              to={t.to}
              replace
              aria-current={on ? 'page' : undefined}
              className={`flex min-h-11 min-w-0 flex-1 items-center justify-center rounded-[9px] px-1 text-center text-label focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-woori-blue ${
                on ? 'bg-white font-bold text-woori-deep shadow-sm' : 'font-medium text-ink-sub hover:text-ink'
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
