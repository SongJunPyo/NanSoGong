import { authMock } from './auth-mock.js'
import { useAuthStore } from '@/store/useAuthStore'

// 첫 매장 기본정보만 저장하는 개발용 어댑터. 서버 경로·DTO 확정 후 request()로 교체한다.
export const updateStoreBasics = (storeId, input) => authMock.updateStore(useAuthStore.getState().accessToken, storeId, input)
