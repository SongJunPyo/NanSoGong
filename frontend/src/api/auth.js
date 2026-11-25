import { authMock } from './auth-mock.js'
import { request } from './client.js'
import { useAuthStore } from '@/store/useAuthStore'

// 사업자 영업 상태만 백엔드에서 조회한다. 나머지 회원·휴대전화 인증은 개발용 Mock을 유지한다.
// 조회 성공 후의 verificationToken은 개발용 가입 화면의 메모리 증명이며 서버 인증 토큰이 아니다.
export const AUTH_MODE = 'mixed'
export const checkLoginId = (loginId) => authMock.checkLoginId(loginId)
export const requestPhoneCode = (input) => authMock.requestPhoneCode(input)
export const verifyPhoneCode = (input) => authMock.verifyPhoneCode(input)
export const verifyBusiness = (input) => authMock.verifyBusiness(input, (bizRegNo) => request('/auth/business-status', {
  method: 'POST',
  body: JSON.stringify({ bizRegNo }),
}))
export const signup = (input) => authMock.signup(input)
export const login = (input) => authMock.login(input)
export const logout = (token = useAuthStore.getState().accessToken) => authMock.logout(token)
export const getCurrentUser = (token = useAuthStore.getState().accessToken) => authMock.getCurrentUser(token)
export const getMyStores = (token = useAuthStore.getState().accessToken) => authMock.getMyStores(token)
