import { authMock } from './auth-mock.js'
import { useAuthStore } from '@/store/useAuthStore'

// 인증 Controller/DTO가 아직 없다. URL·HTTP 요청 형태를 추측하지 않고 Mock 어댑터를 사용한다.
// API 계약 확정 후 이 파일의 어댑터를 client.js의 request() 기반 구현으로 교체한다.
export const AUTH_MODE = 'mock'
export const checkLoginId = (loginId) => authMock.checkLoginId(loginId)
export const requestPhoneCode = (input) => authMock.requestPhoneCode(input)
export const verifyPhoneCode = (input) => authMock.verifyPhoneCode(input)
export const verifyBusiness = (input) => authMock.verifyBusiness(input)
export const signup = (input) => authMock.signup(input)
export const login = (input) => authMock.login(input)
export const logout = (token = useAuthStore.getState().accessToken) => authMock.logout(token)
export const getCurrentUser = (token = useAuthStore.getState().accessToken) => authMock.getCurrentUser(token)
export const getMyStores = (token = useAuthStore.getState().accessToken) => authMock.getMyStores(token)
