import { BrowserRouter, Link, Route, Routes } from 'react-router-dom'
import App from '@/App'
import { ROUTES } from '@/routes'

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
    <div className="flex flex-col gap-1 p-5">
      <h1 className="mb-2 text-h1 font-bold text-ink">화면 목록 ({ROUTES.length})</h1>
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
        <div className="relative mx-auto min-h-dvh max-w-[430px] bg-white">
          <Routes>
            {ROUTES.map(([figma, path, Page]) => (
              <Route key={figma} path={path} element={<Page />} />
            ))}
            <Route path="/dev" element={<App />} />
            <Route path="/screens" element={<ScreenIndex />} />
            <Route path="*" element={<ScreenIndex />} />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  )
}
