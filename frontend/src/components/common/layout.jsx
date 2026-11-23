import { Link, NavLink, useNavigate } from 'react-router-dom'
import { BarChart3, ChevronLeft, Coffee, Home, Package, Settings } from 'lucide-react'

/** 상단 헤더 — Figma 'HF/Header' (뒤로가기 · 제목 · 설정 버튼) */
export function Header({ title, back = true, settings = false }) {
  const navigate = useNavigate()
  return (
    <header className="sticky top-0 z-20 flex h-[60px] items-center gap-2 bg-white px-5">
      {back && (
        <button type="button" aria-label="뒤로" onClick={() => navigate(-1)} className="-ml-1 p-1 text-ink">
          <ChevronLeft size={24} strokeWidth={2.2} />
        </button>
      )}
      <h1 className="truncate text-[22px] font-bold text-ink">{title}</h1>
      {settings && (
        <Link to="/settings" aria-label="설정" className="ml-auto p-1 text-ink">
          <Settings size={24} strokeWidth={1.8} />
        </Link>
      )}
    </header>
  )
}

const TABS = [
  { to: '/', label: '홈', icon: Home, end: true },
  { to: '/inventory', label: '재고', icon: Package },
  { to: '/menu', label: '메뉴', icon: Coffee },
  { to: '/sales', label: '매출', icon: BarChart3 },
]

/** 하단 탭바 — Figma 'HF/TabBar' */
export function TabBar() {
  return (
    <nav className="fixed bottom-0 left-1/2 z-20 grid h-[84px] w-full max-w-[430px] -translate-x-1/2 grid-cols-4 border-t border-line bg-white pb-6">
      {TABS.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            `flex flex-col items-center justify-center gap-[3px] text-[11px] ${
              isActive ? 'font-bold text-woori-deep' : 'text-ink-mute'
            }`
          }
        >
          <Icon size={24} strokeWidth={1.8} />
          {label}
        </NavLink>
      ))}
    </nav>
  )
}

/**
 * 화면 틀 — Figma 프레임 1개 = Screen 1개
 * @param {string} title  헤더 제목
 * @param {boolean} back  뒤로가기 표시
 * @param {boolean} settings 설정 버튼 표시 (홈)
 * @param {boolean} tab   하단 탭바 표시
 */
export function Screen({ title, back = true, settings = false, tab = false, center = false, children }) {
  return (
    <div className="flex min-h-dvh flex-col bg-white">
      <Header title={title} back={back} settings={settings} />
      <main
        className={`flex flex-1 flex-col gap-4 px-screen pt-2 ${tab ? 'pb-[112px]' : 'pb-7'} ${
          center ? 'items-center' : ''
        }`}
      >
        {children}
      </main>
      {tab && <TabBar />}
    </div>
  )
}
