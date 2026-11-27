import { createAuthApi } from './auth-server.js'
import { request } from './client.js'
import { useAuthStore } from '@/store/useAuthStore'

export const AUTH_MODE = 'server'
const api = createAuthApi(request, () => useAuthStore.getState().accessToken)
export const { checkLoginId, requestPhoneCode, verifyPhoneCode, verifyBusiness, signup, login, logout, getCurrentUser, updateCurrentUser, getMyStores, requestPasswordReset, verifyPasswordReset, resetPassword, refreshSession, getCapabilities, requestPhoneChange, confirmPhoneChange, updatePhone } = api
