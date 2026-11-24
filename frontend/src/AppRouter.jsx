import { BrowserRouter, Link, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { Suspense } from 'react'
import App from '@/App'
import { DesktopNav } from '@/components/common/layout'
import { ROUTES } from '@/routes'
import AuthGuard from '@/components/auth/AuthGuard'
import { useAuthStore } from '@/store/useAuthStore'
import { Toaster } from '@/components/ui/toast'
import UiShowcasePage from '@/components/common/UiShowcasePage'

// 예시 id — 화면 목록에서 바로 열어 볼 때 쓴다
const sampleId = (path) =>
  path.startsWith('/promotions')
    ? 'latte-set'
    : path.startsWith('/orders')
      ? 'o1'
      : path.startsWith('/corrections')
        ? 'c1'
        : path.startsWith('/reapproval')
          ? 'o2'
          : path.startsWith('/menu')
            ? 'latte'
            : 'milk'

/** /screens — Figma 프레임별 화면 바로가기 (개발용) */
function ScreenIndex() {
  return (
    <div className="mx-auto grid max-w-6xl gap-1 p-5 md:grid-cols-2 lg:p-8 xl:grid-cols-3">
      <h1 className="mb-2 text-h1 font-bold text-ink md:col-span-2 xl:col-span-3">화면 목록 ({ROUTES.length})</h1>
      <Link to="/dev" className="mb-2 text-label text-woori-blue">
        개발 환경 연결 확인 (/dev) ›
      </Link>
      {ROUTES.map(([figma, path, , uf]) => (
        <Link
          key={path}
          to={path.replace(':id', sampleId(path))}
          className="flex items-center gap-2 border-b border-line py-2.5 text-label"
        >
          <span className="font-medium text-ink">{figma}</span>
          <span className="ml-auto text-caption text-ink-mute">{uf}</span>
        </Link>
      ))}
    </div>
  )
}

/** 앱 화면 라우터 — main.jsx 에서 렌더 (기존 환경 확인판 App 은 /dev 로 이동) */
export default function AppRouter() {
  return (
    <BrowserRouter>
      <div className="min-h-dvh bg-[#f2f3f5]">
        <AppLayout />
      </div>
      <Toaster />   {/* toast() 가 그려지는 자리 — 웹: 오른쪽 위 / 앱: 아래 스낵바 */}
    </BrowserRouter>
  )
}

function AppLayout() {
  const { pathname } = useLocation()
  const token = useAuthStore((state) => state.accessToken)
  const authScreen = ['/login', '/signup', '/find-password', '/onboarding/store'].some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  )
  // 가입·초기 설정·잠금 화면은 메뉴 없이 입력에 집중하는 폭을 유지한다.
  const accountScreen = ['/login', '/signup', '/find-password', '/onboarding', '/lock'].some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  )

  return (
    <div className={`mx-auto min-h-dvh w-full ${accountScreen ? authScreen ? 'max-w-5xl' : 'max-w-lg' : 'max-w-[1600px] lg:flex lg:items-start'}`}>
      {!accountScreen && <DesktopNav />}
      <div className="relative min-h-dvh min-w-0 flex-1 bg-white">
        <Suspense fallback={<main role="status" className="p-8 text-label text-ink-sub">화면을 불러오는 중이에요.</main>}>
          <Routes>
          {ROUTES.map(([figma, path, Page]) => (
            <Route key={figma} path={path} element={['/login', '/signup', '/signup/business', '/signup/complete', '/find-password'].includes(path) ? <Page /> : <AuthGuard><Page /></AuthGuard>} />
          ))}
          <Route path="/dev" element={<AuthGuard><App /></AuthGuard>} />
          <Route path="/dev/ui" element={<AuthGuard><UiShowcasePage /></AuthGuard>} />
          <Route path="/screens" element={<AuthGuard><ScreenIndex /></AuthGuard>} />
          <Route path="*" element={<Navigate to={token ? '/' : '/login'} replace />} />
          </Routes>
        </Suspense>
      </div>
    </div>
  )
}
