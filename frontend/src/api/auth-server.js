// HTTP 경계를 주입해 실제 API 계약을 테스트한다. 인증키·가짜 가입 증명은 클라이언트에서 만들지 않는다.
export function createAuthApi(request, getToken = () => null) {
  const post = (path, input) => request(path, { method: 'POST', body: JSON.stringify(input) })
  const authorization = (token) => token ? { headers: { Authorization: `Bearer ${token}` } } : {}
  // 익명 재설정 요청은 메모리에 남은 만료 JWT를 보내지 않는다.
  const anonymousPost = (path, input) => request(path, { method: 'POST', headers: { Authorization: '' }, body: JSON.stringify(input) })
  return {
    async checkLoginId(loginId) {
      const result = await request(`/auth/login-id/exists?loginId=${encodeURIComponent(loginId)}`)
      return { loginId, available: !result.exists }
    },
    requestPhoneCode: ({ name, phone }) => post('/auth/phone-verifications', { name, phone }),
    verifyPhoneCode: ({ challengeId, name, phone, code }) => post(`/auth/phone-verifications/${encodeURIComponent(challengeId)}/confirmations`, { name, phone, code }),
    verifyBusiness: ({ bizRegNo, ownerName, openingDate }) => post('/auth/business-verifications', { bizRegNo, ownerName, openingDate }),
    signup: ({ loginId, password, name, phone, phoneVerificationToken, stores }) => post('/auth/signup', {
      loginId, password, name, phone, phoneVerificationToken,
      stores: stores.map(({ bizRegNo, ownerName, openingDate, bizName }) => ({ bizRegNo, ownerName, openingDate, bizName })),
    }),
    login: ({ loginId, password, rememberMe = false }) => post('/auth/login', { loginId, password, rememberMe }),
    refreshSession: () => request('/auth/refresh', { method: 'POST' }),
    getCapabilities: () => request('/auth/capabilities'),
    requestPhoneChange: ({ phone, currentPassword }) => post('/me/phone-verifications', { phone, currentPassword }),
    confirmPhoneChange: ({ challengeId, phone, code }) => post(`/me/phone-verifications/${encodeURIComponent(challengeId)}/confirmations`, { phone, code }),
    async updatePhone({ phone, verificationToken }) {
      const member = await request('/me/phone', { method: 'PATCH', body: JSON.stringify({ phone, verificationToken }) })
      return { ...member, memberId: member.id }
    },
    requestPasswordReset: ({ loginId, phone }) => anonymousPost('/auth/password-resets', { loginId, phone }),
    verifyPasswordReset: ({ challengeId, loginId, phone, code }) => anonymousPost(`/auth/password-resets/${encodeURIComponent(challengeId)}/confirmations`, { loginId, phone, code }),
    resetPassword: ({ resetToken, password, passwordConfirm }) => anonymousPost('/auth/password-resets/completions', { resetToken, password, passwordConfirm }),
    logout: () => request('/auth/logout', { method: 'POST' }),
    async getCurrentUser(token = getToken()) {
      const member = await request('/me', authorization(token))
      return { ...member, memberId: member.id }
    },
    async updateCurrentUser({ name, currentPassword, password, passwordConfirm }, token = getToken()) {
      const member = await request('/me', {
        method: 'PATCH', ...authorization(token),
        body: JSON.stringify({ name, currentPassword, password, passwordConfirm }),
      })
      return { ...member, memberId: member.id }
    },
    async getMyStores(token = getToken()) {
      const stores = []
      for (let page = 0; ; page += 1) {
        const result = await request(`/stores?page=${page}&size=100&sort=id,asc`, authorization(token))
        const totalPages = result.page?.totalPages ?? result.totalPages
        if (!Array.isArray(result.content) || !Number.isInteger(totalPages) || totalPages < 0) throw new Error('매장 목록을 확인할 수 없어요. 다시 로그인해 주세요.')
        stores.push(...result.content)
        if (page + 1 >= totalPages) return stores
      }
    },
  }
}
