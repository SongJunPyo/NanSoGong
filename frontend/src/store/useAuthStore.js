// 🐻 Zustand: 화면 여러 곳에서 함께 쓰는 "클라이언트 상태" (로그인 정보. 선택한 매장은 useStoreSelection)
// 🚨 서버에서 받아 오는 데이터(매출 · 재고 등)는 여기 두지 않고 TanStack Query 로 관리한다
import { create } from 'zustand'

export const useAuthStore = create((set) => ({
  accessToken: null,      // 메모리에만 보관 (localStorage 는 XSS 로 털릴 수 있다)
                          // 새로고침 · 앱 재실행 시에는 HttpOnly 쿠키의 refresh 토큰으로 다시 받아 온다 (자동 로그인, 구현-1-3)
  user: null,
  sessionEpoch: 0,
  ready: false,

  login: (accessToken, user) => set((state) => ({ accessToken, user, ready: true, sessionEpoch: state.sessionEpoch + 1 })),
  logout: () => set((state) => ({ accessToken: null, user: null, ready: true, sessionEpoch: state.sessionEpoch + 1 })),
  renewToken: (accessToken, epoch) => {
    let renewed = false
    set((state) => { if (state.sessionEpoch !== epoch) return state; renewed = true; return { accessToken } })
    return renewed
  },
}))
