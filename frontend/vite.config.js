import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),            // Tailwind CSS v4: tailwind.config.js 없이 index.css 의 @import "tailwindcss" 한 줄로 동작
    VitePWA({                 // 📱 사장님이 휴대폰 홈 화면에 "앱처럼" 설치할 수 있게
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      manifest: {
        name: '난소공 · 사장님 매장 도우미',
        short_name: '난소공',
        description: '소상공인 맞춤형 AI 매장 운영 에이전트',
        lang: 'ko',
        theme_color: '#2b62a8',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        icons: [
          // TODO 디자인 확정 후 192x192 · 512x512 PNG 로 바꾼다 (iOS 는 PNG 아이콘이 필요)
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
        ],
      },
      workbox: {
        navigateFallbackDenylist: [/^\/api\//],   // /api 요청은 서비스워커가 가로채지 않는다
      },
      devOptions: {
        enabled: false,       // 개발 중에는 서비스워커를 끈다 (캐시 때문에 화면이 안 바뀌는 혼란 방지). 확인할 때만 true
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),   // import Button from '@/components/ui/button' (shadcn/ui 가 이 별칭을 쓴다)
    },
  },
  server: {
    port: 5173,
    strictPort: true,         // 🚨 5173 이 이미 쓰이면 다른 포트로 도망가지 않고 멈춘다 (서버 CORS 가 5173 만 허용)
  },
})
