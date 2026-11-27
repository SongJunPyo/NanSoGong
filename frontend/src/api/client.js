// 서버 호출·쿠키 CSRF·만료 시 한 번의 Refresh·세션 변경 후 늦은 응답 차단.
import { useAuthStore } from '@/store/useAuthStore'
import { useStoreSelection } from '@/store/useStoreSelection'
import { useSignupStore } from '@/store/useSignupStore'
import { createApiTransport } from './auth-transport'

const BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:8080/api'
const transport = createApiTransport({
  base: BASE,
  fetcher: (...args) => fetch(...args),
  getSession: () => useAuthStore.getState(),
  renewToken: (token, epoch) => useAuthStore.getState().renewToken(token, epoch),
  expireSession: (epoch) => {
    if (useAuthStore.getState().sessionEpoch !== epoch) return
    useStoreSelection.getState().clear()
    useSignupStore.getState().reset()
    useAuthStore.getState().logout()
  },
  // 탭 간에도 같은 HttpOnly 쿠키의 회전·로그아웃·로그인을 직렬화한다.
  cookieLock: (work) => globalThis.navigator?.locks ? navigator.locks.request('nansogong-auth-cookie', work) : work(),
})
export const request = transport.request
export const pingApi = () => request('/ping')
