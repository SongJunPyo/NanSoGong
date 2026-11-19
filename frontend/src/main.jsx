import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import './index.css'
import App from './App.jsx'

// 🔄 TanStack Query: 서버 데이터를 가져오고 · 캐시하고 · 다시 가져오는 일을 맡긴다
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,    // 30초 동안은 같은 데이터를 다시 요청하지 않는다
      retry: 1,
    },
  },
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
      <ReactQueryDevtools initialIsOpen={false} />   {/* 개발 중에만 보이는 쿼리 상태 창 (배포 빌드에서는 자동 제외) */}
    </QueryClientProvider>
  </StrictMode>,
)
