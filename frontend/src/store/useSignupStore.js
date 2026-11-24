import { create } from 'zustand'
import { emptyMember } from '@/utils/auth'

// 비밀번호·인증 증명·가입 초안은 메모리에만 둔다. persist/history state에 넣지 않는다.
export const useSignupStore = create((set) => ({
  member: emptyMember(), checkedLoginId: null, phoneProof: null, businesses: [], completed: null,
  updateMember: (key, value) => set((state) => ({
    member: { ...state.member, [key]: value },
    ...(key === 'loginId' ? { checkedLoginId: null } : {}),
    ...(['phone', 'name'].includes(key) ? { phoneProof: null } : {}),
    completed: null,
  })),
  checkLoginId: (loginId) => set({ checkedLoginId: loginId }),
  verifyPhone: (phoneProof) => set({ phoneProof }),
  setBusinesses: (businesses) => set({ businesses }),
  finish: (completed) => set({ member: emptyMember(), checkedLoginId: null, phoneProof: null, businesses: [], completed }),
  reset: () => set({ member: emptyMember(), checkedLoginId: null, phoneProof: null, businesses: [], completed: null }),
}))
