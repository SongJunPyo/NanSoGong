import { useSyncExternalStore } from 'react'

// 화면 폭 기준 — Tailwind 기본 중단점과 같다 (md 768 · lg 1024)
//   web  (≥1024px): 사장님이 앉아서 넓게 보고 한꺼번에 관리
//   app  (<768px) : 매장에서 알림을 받고 한 손으로 바로 승인
//   tablet(768~1023px): 표에 따로 정한 모습이 없어 app 모습을 따른다 (하단 탭바도 lg 미만에서 보임)
const DESKTOP_QUERY = '(min-width: 1024px)'
const HOVER_QUERY = '(hover: hover) and (pointer: fine)'

const subscribeTo = (query) => (onChange) => {
  const media = window.matchMedia(query)
  media.addEventListener('change', onChange)
  return () => media.removeEventListener('change', onChange)
}
const subscribeDesktop = subscribeTo(DESKTOP_QUERY)
const subscribeHover = subscribeTo(HOVER_QUERY)

/** true = 웹(PC) 모습, false = 앱(휴대폰) 모습 */
export function useIsDesktop() {
  return useSyncExternalStore(subscribeDesktop, () => window.matchMedia(DESKTOP_QUERY).matches, () => false)
}

/** 마우스를 올릴 수 있는 기기인지 (툴팁을 hover 로 열지, 눌러서 열지) */
export function useCanHover() {
  return useSyncExternalStore(subscribeHover, () => window.matchMedia(HOVER_QUERY).matches, () => false)
}
