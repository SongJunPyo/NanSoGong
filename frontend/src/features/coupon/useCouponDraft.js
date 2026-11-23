// 프로모션(쿠폰) 승인 전 임시 입력값 — 15 조건 수정 · 16 발행 결정 · 16-1 결과 · 44 성과가 같이 쓴다
// 서버 저장 전 화면 사이에서만 공유하는 값이라 이 영역 안에 둔다
import { create } from 'zustand'

export const useCouponDraft = create((set) => ({
  promotionName: '비 오는 오후 라떼 세트',
  setPromotionName: (promotionName) => set({ promotionName }),
}))
