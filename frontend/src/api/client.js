// src/api/client.js — 백엔드 호출은 모두 request() 하나를 거친다
// 공통으로 해야 할 일(헤더 · 에러 처리 · 로그인 토큰)을 이 파일 한 곳에서만 고치면 된다
import { useAuthStore } from '@/store/useAuthStore'

// 서버 주소. 로컬은 CORS 설정(WebConfig)으로 8080 을 바로 부른다. 배포는 Actions 가 VITE_API_BASE=/api 로 빌드한다
const BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:8080/api'

export async function request(path, options = {}) {
  const token = useAuthStore.getState().accessToken   // 컴포넌트 밖에서도 Zustand 상태를 읽을 수 있다

  let res
  try {
    res = await fetch(`${BASE}${path}`, {
      credentials: 'include',     // 자동 로그인용 refresh 토큰(HttpOnly 쿠키)을 서버와 주고받는다
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
    })
  } catch {
    // 서버가 꺼져 있거나 CORS 로 막히면 응답 자체가 없다
    const err = new Error('서버에 연결할 수 없습니다. 서버(8080)가 켜져 있는지 확인해 주세요.')
    err.code = 'NETWORK'
    throw err
  }

  if (res.status === 401) {
    useAuthStore.getState().logout()     // 토큰 만료 · 위조 → 로그아웃 상태로
  }

  const body = res.status === 204 ? null : await res.json().catch(() => null)
  if (!res.ok) {
    const err = new Error(body?.message ?? `요청 실패 (${res.status})`)
    err.status = res.status
    throw err
  }
  return body
}

// 엔드포인트별 함수는 기능 단위로 파일을 나눠 추가한다 (예: src/api/sales.js, src/api/inventory.js)
export const pingApi = () => request('/ping')
