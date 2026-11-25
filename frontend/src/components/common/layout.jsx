import { Link, NavLink, useNavigate } from 'react-router-dom'
import { BadgePercent, BarChart3, ChevronLeft, Coffee, Home, Package, Settings } from 'lucide-react'
import { HeaderNotifications } from '@/components/home/HomeNotifications'

/** 헤더 오른쪽 아이콘 — 마우스를 올리면 살짝 커지고 아래에 이름이 뜬다 */
function HeaderIcon({ to, label, icon: Icon }) {
  return (
    <Link
      to={to}
      aria-label={label}
      className="group relative flex size-10 items-center justify-center rounded-lg text-ink hover:bg-white/80 focus-visible:outline-2 focus-visible:outline-woori-blue"
    >
      <Icon size={24} strokeWidth={1.8} aria-hidden="true" className="transition-transform duration-150 group-hover:scale-115 group-focus-visible:scale-115" />
      <span aria-hidden="true" className="pointer-events-none absolute top-full left-1/2 z-40 mt-1 -translate-x-1/2 whitespace-nowrap rounded-md bg-ink px-2 py-0.5 text-[11px] font-bold text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
        {label}
      </span>
    </Link>
  )
}

/** 상단 헤더 — Figma 'HF/Header' (뒤로가기 · 제목 · 설정 버튼). 바탕은 연한 파랑(woori-tint) */
export function Header({ title, eyebrow, back = true, backTo, settings = false, actions }) {
  const navigate = useNavigate()
  return (
    <header
      className={`sticky top-0 z-30 flex min-w-0 items-center gap-2 bg-woori-tint px-5 lg:border-b lg:border-woori-blue/10 lg:px-8 ${
        eyebrow ? 'min-h-[60px] py-2 lg:min-h-20' : 'h-[60px] lg:h-20'
      }`}
    >
      {back && (
        <button type="button" aria-label="뒤로" onClick={() => (backTo ? navigate(backTo, { replace: true }) : navigate(-1))} className="-ml-1 p-1 text-ink">
          <ChevronLeft size={24} strokeWidth={2.2} />
        </button>
      )}
      {eyebrow ? (
        <div className="flex min-w-0 flex-col">
          {eyebrow}
          <h1 className="truncate text-[22px] font-bold text-ink">{title}</h1>
        </div>
      ) : (
        <h1 className="truncate text-[22px] font-bold text-ink">{title}</h1>
      )}
      {(actions || settings) && (
        <div className="relative ml-auto flex shrink-0 items-center gap-2">
          {actions}
          {settings && (
            <>
              {/* 프로모션 운영 설정 — 설정 목록에서 헤더로 옮겼다 */}
              <HeaderIcon to="/settings/promotion" label="프로모션" icon={BadgePercent} />
              <HeaderIcon to="/settings" label="설정" icon={Settings} />
            </>
          )}
        </div>
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
    <nav aria-label="모바일 주요 메뉴" className="fixed inset-x-0 bottom-0 z-20 grid h-[calc(84px+env(safe-area-inset-bottom))] w-full grid-cols-4 border-t border-line bg-white pb-[calc(24px+env(safe-area-inset-bottom))] lg:hidden">
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

/** PC에서는 주요 메뉴를 왼쪽에 고정해 상세 화면에서도 이동할 수 있게 한다. */
export function DesktopNav() {
  return (
    <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-line bg-white p-6 lg:flex">
      <Link to="/" className="mb-10 flex items-center gap-3 rounded-lg focus-visible:outline-2 focus-visible:outline-woori-blue">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-woori-deep text-white">
          <Coffee size={24} aria-hidden="true" />
        </span>
        <span>
          <span className="block text-h1 font-bold text-woori-deep">난소공</span>
          <span className="block text-caption text-ink-sub">AI 매장 운영 에이전트</span>
        </span>
      </Link>
      <nav aria-label="주요 메뉴" className="flex flex-col gap-2">
        {TABS.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-input px-4 py-3.5 text-body font-bold transition-colors focus-visible:outline-2 focus-visible:outline-woori-blue ${
                isActive ? 'bg-woori-tint text-woori-deep' : 'text-ink-sub hover:bg-surface-muted hover:text-ink'
              }`
            }
          >
            <Icon size={22} aria-hidden="true" />
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}

/**
 * 화면 틀 — Figma 프레임 1개 = Screen 1개
 * @param {string} title  헤더 제목
 * @param {boolean} back  뒤로가기 표시
 * @param {boolean} settings 설정 버튼 표시 (홈)
 * @param {boolean} tab   하단 탭바 표시
 * @param {boolean} wide  대시보드처럼 여러 열을 쓰는 화면
 * @param {boolean} compact 홈 요약 화면의 간격 축소
 * @param {React.ReactNode} headerActions 헤더 오른쪽에 표시할 도메인별 동작
 * @param {React.ReactNode} eyebrow 제목 위 작은 줄 (예: 홈의 매장 선택)
 * @param {string} backTo 뒤로가기를 이전 화면 대신 이 주소로 (예: 등록을 마친 결과 화면 → 홈)
 */
export function Screen({ title, eyebrow, back = true, backTo, settings = false, tab = false, center = false, wide = false, compact = false, headerActions, children }) {
  return (
    <div className="flex min-h-dvh flex-col bg-white">
      <Header
        title={title} eyebrow={eyebrow} back={back} backTo={backTo} settings={settings || tab}
        actions={headerActions ?? (tab ? <HeaderNotifications /> : undefined)}
      />
      <main
        className={`mx-auto flex w-full min-w-0 flex-1 flex-col gap-4 px-screen pt-2 md:px-6 lg:px-8 ${compact ? 'lg:gap-4 lg:pt-4 lg:pb-6' : 'lg:gap-6 lg:pt-6 lg:pb-10'} ${wide ? 'max-w-6xl' : 'max-w-3xl'} ${tab ? 'pb-[calc(112px+env(safe-area-inset-bottom))]' : 'pb-7'} ${
          center ? 'items-center' : ''
        }`}
      >
        {children}
      </main>
      {tab && <TabBar />}
    </div>
  )
}
