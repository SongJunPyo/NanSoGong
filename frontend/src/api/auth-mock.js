import { emptyMember, normalizeBusiness, normalizePhone, validateBusiness, validateMember, validateStore, WEEK_DAYS } from '../utils/auth.js'

export const MOCK_AUTH = {
  code: '000000', password: 'Owner123!',
  users: [{ loginId: 'demoowner', label: '매장 설정 완료' }, { loginId: 'setupowner', label: '첫 매장 설정 필요' }],
}

function failure(message, field, code = 'VALIDATION', status = 400) {
  return Object.assign(new Error(message), { field, code, status })
}
const copy = (value) => structuredClone(value)
const fingerprint = (value) => JSON.stringify(normalizeBusiness(value))

// 개발 화면 전용 가상 서버. 브라우저 저장소·쿠키에 계정/비밀번호/인증번호/토큰을 저장하지 않는다.
// 응답과 인자는 프론트 내부 모델이다. 실제 HTTP API 계약으로 사용하지 않는다.
export function createAuthMock({ delayMs = 180, now = () => Date.now() } = {}) {
  const members = new Map(), stores = new Map(), sessions = new Map()
  const challenges = new Map(), phoneProofs = new Map(), businessProofs = new Map()
  const retryBusinesses = new Set(), retrySignups = new Set()
  let memberSequence = 3, storeSequence = 3, seedPromise
  const pause = () => delayMs ? new Promise((resolve) => setTimeout(resolve, delayMs)) : Promise.resolve()
  const hash = async (password, salt) => {
    const buffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${salt}:${password}`))
    return Array.from(new Uint8Array(buffer), (value) => value.toString(16).padStart(2, '0')).join('')
  }
  const publicMember = ({ memberId, loginId, name, phone }) => ({ memberId, loginId, name, phone })
  async function ready() {
    await pause()
    seedPromise ??= (async () => {
      for (const [index, entry] of MOCK_AUTH.users.entries()) {
        const memberId = index + 1, salt = crypto.randomUUID()
        members.set(entry.loginId, { memberId, loginId: entry.loginId, name: '개발용 사장님', phone: `0101234567${index}`, salt, passwordHash: await hash(MOCK_AUTH.password, salt) })
        stores.set(memberId, [{ storeId: memberId, memberId, bizRegNo: index ? '2020202020' : '1010101010', bizName: index ? '새 매장' : 'WON썸플레이스', ownerName: '개발용 사장님', businessOpenedOn: '2026-01-01', verifyStatus: 'VERIFIED', name: index ? '새 매장' : 'WON썸플레이스', category: index ? '' : '카페', address: index ? '' : '서울 성동구 성수이로 1', openHours: {}, closedDays: [], onboardingStatus: {} }])
        // 홈 매장 전환 확인용 — 설정을 마친 계정(demoowner)에 두 번째 매장을 둔다
        if (!index) stores.get(memberId).push({ storeId: 101, memberId, bizRegNo: '3030303030', bizName: 'WON썸플레이스 2호점', ownerName: '개발용 사장님', businessOpenedOn: '2026-03-01', verifyStatus: 'VERIFIED', name: 'WON썸플레이스 2호점', category: '카페', address: '서울 성동구 왕십리로 2', openHours: {}, closedDays: [], onboardingStatus: {} })
      }
    })()
    await seedPromise
  }
  function owner(token) {
    const session = sessions.get(token)
    const member = session && [...members.values()].find((item) => item.memberId === session.memberId)
    if (!member) throw failure('로그인이 필요해요. 다시 로그인해 주세요.', null, 'UNAUTHORIZED', 401)
    return member
  }
  const duplicateBusiness = (number) => [...stores.values()].flat().some((store) => store.bizRegNo === number)
  function checkFields(errors) {
    const first = Object.entries(errors)[0]
    if (first) throw failure(first[1], first[0])
  }

  return {
    async checkLoginId(loginId) {
      await ready()
      checkFields(Object.fromEntries(Object.entries(validateMember({ ...emptyMember(), loginId })).filter(([key]) => key === 'loginId')))
      return { available: !members.has(loginId), loginId }
    },
    async requestPhoneCode({ phone, name }) {
      await ready()
      const errors = validateMember({ ...emptyMember(), phone, name })
      checkFields(Object.fromEntries(Object.entries(errors).filter(([key]) => ['phone', 'name'].includes(key))))
      const challengeId = crypto.randomUUID(), expiresAt = now() + 180000
      challenges.set(challengeId, { phone: normalizePhone(phone), name: name.trim(), expiresAt, attempts: 0 })
      return { challengeId, expiresAt }
    },
    async verifyPhoneCode({ challengeId, phone, name, code }) {
      await ready()
      const challenge = challenges.get(challengeId)
      if (!challenge || challenge.phone !== normalizePhone(phone) || challenge.name !== name.trim() || challenge.expiresAt <= now()) throw failure('인증 요청이 만료되었어요. 인증번호를 다시 요청해 주세요.', 'code', 'PHONE_EXPIRED')
      if (++challenge.attempts > 5) throw failure('인증 시도 횟수를 초과했어요. 인증번호를 다시 요청해 주세요.', 'code', 'PHONE_ATTEMPTS')
      if (code !== MOCK_AUTH.code) throw failure('인증번호가 일치하지 않아요.', 'code')
      challenges.delete(challengeId)
      const verificationToken = crypto.randomUUID(), expiresAt = now() + 600000
      phoneProofs.set(verificationToken, { phone: challenge.phone, name: challenge.name, expiresAt })
      return { verificationToken, expiresAt, phone: challenge.phone, name: challenge.name }
    },
    async verifyBusiness(input, lookupStatus) {
      await ready()
      checkFields(validateBusiness(input))
      const business = normalizeBusiness(input)
      let status
      if (lookupStatus) {
        // 화면에서는 항상 백엔드 조회 함수를 전달한다. 실패 시 가짜 성공으로 대체하지 않는다.
        const response = await lookupStatus(business.bizRegNo)
        if (response?.bizRegNo !== business.bizRegNo || !['ACTIVE', 'SUSPENDED', 'CLOSED', 'NOT_FOUND'].includes(response?.status)) {
          throw failure('사업자 상태조회 결과를 확인할 수 없어요. 다시 시도해 주세요.', null, 'BUSINESS_UNAVAILABLE', 502)
        }
        status = response.status
      } else {
        // 순수 Mock 테스트용 번호 시나리오. 실제 백엔드 조회 경로에는 적용하지 않는다.
        const statuses = { '7777777777': 'SUSPENDED', '9999999999': 'CLOSED', '8888888888': 'MISMATCH', '6666666666': 'DUPLICATE', '0000000000': 'NOT_FOUND' }
        if (business.bizRegNo === '5555555555' && !retryBusinesses.has(business.bizRegNo)) {
          retryBusinesses.add(business.bizRegNo)
          throw failure('사업자 확인 요청에 실패했어요. 입력을 유지했으니 다시 시도해 주세요.', null, 'BUSINESS_UNAVAILABLE', 503)
        }
        status = statuses[business.bizRegNo] ?? 'ACTIVE'
      }
      if (status !== 'ACTIVE') return { status }
      if (duplicateBusiness(business.bizRegNo)) return { status: 'DUPLICATE' }
      // 기존 개발용 가입 흐름을 위한 로컬 증명이다. 실제 회원가입의 서버 검증을 대신하지 않는다.
      const verificationToken = crypto.randomUUID()
      businessProofs.set(verificationToken, { fingerprint: fingerprint(business), expiresAt: now() + 600000 })
      return { status, verificationToken, business }
    },
    async signup(input) {
      await ready()
      checkFields(validateMember({ ...input, passwordConfirm: input.password }))
      if (members.has(input.loginId)) throw failure('이미 사용 중인 아이디예요. 다른 아이디를 확인해 주세요.', 'loginId', 'DUPLICATE_LOGIN_ID', 409)
      const proof = phoneProofs.get(input.phoneVerificationToken)
      if (!proof || proof.phone !== normalizePhone(input.phone) || proof.name !== input.name.trim() || proof.expiresAt <= now()) throw failure('휴대전화 인증이 만료되었거나 정보가 변경되었어요. 회원정보 단계에서 다시 인증해 주세요.', 'phone', 'PHONE_EXPIRED')
      if (!input.stores?.length) throw failure('검증한 사업자정보를 최소 1개 등록해 주세요.', 'stores')
      const seen = new Set()
      for (const business of input.stores) {
        checkFields(validateBusiness(business))
        const number = normalizeBusiness(business).bizRegNo
        if (seen.has(number) || duplicateBusiness(number)) throw failure('이미 등록했거나 다른 계정에서 사용하는 사업자등록번호예요.', 'stores', 'DUPLICATE_BUSINESS', 409)
        seen.add(number)
        const verification = businessProofs.get(business.verificationToken)
        if (!verification || verification.expiresAt <= now() || verification.fingerprint !== fingerprint(business)) throw failure('사업자정보를 다시 검증해 주세요.', 'stores', 'BUSINESS_EXPIRED')
      }
      if (input.loginId === 'retryowner' && !retrySignups.has(input.loginId)) {
        retrySignups.add(input.loginId)
        throw failure('개발용 가입 실패 예시예요. 입력 정보는 유지되며 다시 요청하면 가입할 수 있어요.', null, 'SIGNUP_UNAVAILABLE', 503)
      }
      const salt = crypto.randomUUID(), passwordHash = await hash(input.password, salt)
      // 해시 계산 중 동시에 들어온 가입 요청도 저장 직전에 재검사한다.
      if (members.has(input.loginId) || [...seen].some(duplicateBusiness)) throw failure('아이디 또는 사업자가 이미 등록되었어요. 입력을 확인해 주세요.', null, 'DUPLICATE_SIGNUP', 409)
      const memberId = memberSequence++
      const createdStores = input.stores.map((entry) => {
        const business = normalizeBusiness(entry)
        return { storeId: storeSequence++, memberId, bizRegNo: business.bizRegNo, bizName: business.bizName, ownerName: business.ownerName, businessOpenedOn: `${business.openingDate.slice(0, 4)}-${business.openingDate.slice(4, 6)}-${business.openingDate.slice(6)}`, verifyStatus: 'VERIFIED', name: business.bizName, category: '', address: '', openHours: {}, closedDays: [], onboardingStatus: {} }
      })
      members.set(input.loginId, { memberId, loginId: input.loginId, name: input.name.trim(), phone: normalizePhone(input.phone), salt, passwordHash })
      stores.set(memberId, createdStores)
      phoneProofs.delete(input.phoneVerificationToken)
      input.stores.forEach((business) => businessProofs.delete(business.verificationToken))
      return { loginId: input.loginId, businessCount: createdStores.length }
    },
    async login({ loginId, password }) {
      await ready()
      const member = members.get(loginId)
      if (!member || member.passwordHash !== await hash(password, member.salt)) throw failure('아이디 또는 비밀번호를 확인해 주세요.', null, 'INVALID_CREDENTIALS', 401)
      const accessToken = `mock-session:${crypto.randomUUID()}`
      sessions.set(accessToken, { memberId: member.memberId })
      return { accessToken, user: publicMember(member) }
    },
    async logout(token) { await ready(); sessions.delete(token) },
    async getCurrentUser(token) { await ready(); return publicMember(owner(token)) },
    async getMyStores(token) { await ready(); return copy(stores.get(owner(token).memberId) ?? []) },
    async updateStore(token, storeId, input) {
      await ready()
      checkFields(validateStore(input))
      const member = owner(token), owned = stores.get(member.memberId) ?? []
      const store = owned.find((item) => item.storeId === storeId)
      if (!store) throw failure('내 매장만 수정할 수 있어요.', null, 'STORE_FORBIDDEN', 403)
      Object.assign(store, { name: input.name.trim(), category: input.category.trim(), address: input.address.trim(), closedDays: [...input.closedDays], openHours: Object.fromEntries(WEEK_DAYS.filter(([day]) => !input.closedDays.includes(day) && input.openTime && input.closeTime).map(([day]) => [day, [input.openTime, input.closeTime]])), onboardingStatus: { ...store.onboardingStatus, storeBasics: true } })
      return copy(store)
    },
  }
}

export const authMock = createAuthMock()
