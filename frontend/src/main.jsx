import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import '@kfonts/nexon-lv1-gothic'   // 넥슨Lv1고딕 (Light 300 · Regular 400 · Bold 700)
import './index.css'
import AppRouter from './AppRouter.jsx'   // 화면 라우터 (기존 환경 확인판 App 은 /dev 로 이동)

// 🔄 TanStack Query: 서버 데이터를 가져오고 · 캐시하고 · 다시 가져오는 일을 맡긴다
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,    // 30초 동안은 같은 데이터를 다시 요청하지 않는다
      retry: 1,
    },
  },
})

const SHOW_DEVTOOLS = new URLSearchParams(window.location.search).has('devtools')

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AppRouter />
      {/* 개발 중에만 보이는 쿼리 상태 창 (배포 빌드에서는 자동 제외)
          오른쪽 아래 버튼이 하단 탭 · 주요 버튼을 가려서, 주소에 ?devtools 를 붙여 열었을 때만 띄운다 */}
      {SHOW_DEVTOOLS && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  </StrictMode>,
)
