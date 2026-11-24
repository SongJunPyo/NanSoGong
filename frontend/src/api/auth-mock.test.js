import test from 'node:test'
import assert from 'node:assert/strict'
import { createAuthMock } from './auth-mock.js'
import { loginDestination } from '../utils/auth.js'

const member = (extra = {}) => ({ loginId: 'testowner', password: 'Owner123!', name: '김사장', phone: '01012345678', ...extra })
const business = (extra = {}) => ({ bizRegNo: '1234567890', ownerName: '김사장', openingDate: '20260101', bizName: '테스트 매장', ...extra })
async function phoneProof(api, identity = member()) {
  const challenge = await api.requestPhoneCode(identity)
  return api.verifyPhoneCode({ ...identity, challengeId: challenge.challengeId, code: '000000' })
}
async function verifiedBusiness(api, input = business()) {
  const result = await api.verifyBusiness(input)
  assert.equal(result.status, 'ACTIVE')
  return { ...input, verificationToken: result.verificationToken }
}
async function payload(api, extra = {}, businesses) {
  const identity = member(extra), proof = await phoneProof(api, identity)
  return { ...identity, phoneVerificationToken: proof.verificationToken, stores: businesses ?? [await verifiedBusiness(api)] }
}

test('아이디 중복 및 로그인 실패·현재 사용자·매장 조회·로그아웃', async () => {
  const api = createAuthMock({ delayMs: 0 })
  assert.equal((await api.checkLoginId('demoowner')).available, false)
  assert.equal((await api.checkLoginId('newowner')).available, true)
  await assert.rejects(api.login({ loginId: 'demoowner', password: 'wrong' }), (error) => error.code === 'INVALID_CREDENTIALS')
  const session = await api.login({ loginId: 'demoowner', password: 'Owner123!' })
  const user = await api.getCurrentUser(session.accessToken)
  assert.equal(user.loginId, 'demoowner')
  assert.equal('passwordHash' in user, false)
  assert.equal(loginDestination(await api.getMyStores(session.accessToken)), '/')
  await api.logout(session.accessToken)
  await assert.rejects(api.getCurrentUser(session.accessToken), (error) => error.status === 401)
})

test('휴대전화 인증 오류·입력 변경·만료·재요청을 처리한다', async () => {
  let time = 1000
  const api = createAuthMock({ delayMs: 0, now: () => time })
  const identity = member(), challenge = await api.requestPhoneCode(identity)
  await assert.rejects(api.verifyPhoneCode({ ...identity, challengeId: challenge.challengeId, code: '111111' }), /일치하지/)
  await assert.rejects(api.verifyPhoneCode({ ...identity, phone: '01099999999', challengeId: challenge.challengeId, code: '000000' }), /만료/)
  time += 180001
  await assert.rejects(api.verifyPhoneCode({ ...identity, challengeId: challenge.challengeId, code: '000000' }), /만료/)
  assert.ok((await phoneProof(api)).verificationToken)
})

test('사업자 상태와 API 오류 후 재시도를 구분한다', async () => {
  const api = createAuthMock({ delayMs: 0 })
  for (const [bizRegNo, expected] of [['7777777777', 'SUSPENDED'], ['9999999999', 'CLOSED'], ['8888888888', 'MISMATCH'], ['6666666666', 'DUPLICATE'], ['0000000000', 'NOT_FOUND']]) {
    const result = await api.verifyBusiness(business({ bizRegNo }))
    assert.equal(result.status, expected)
    assert.equal(result.verificationToken, undefined)
  }
  await assert.rejects(api.verifyBusiness(business({ bizRegNo: '5555555555' })), (error) => error.status === 503)
  assert.equal((await api.verifyBusiness(business({ bizRegNo: '5555555555' }))).status, 'ACTIVE')
})

test('사업자 0개·인증 위조·검증 후 수정 시 계정이 생성되지 않는다', async () => {
  const api = createAuthMock({ delayMs: 0 }), input = await payload(api)
  await assert.rejects(api.signup({ ...input, stores: [] }), /최소 1개/)
  await assert.rejects(api.signup({ ...input, phoneVerificationToken: 'invalid' }), /휴대전화 인증/)
  await assert.rejects(api.signup({ ...input, stores: [{ ...input.stores[0], ownerName: '변경된 대표' }] }), /다시 검증/)
  assert.equal((await api.checkLoginId(input.loginId)).available, true)
  assert.equal((await api.signup(input)).businessCount, 1)
})

test('중복 사업자를 차단하고 복수 사업자를 각각 매장으로 생성한다', async () => {
  const api = createAuthMock({ delayMs: 0 })
  const a = await verifiedBusiness(api), b = await verifiedBusiness(api, business({ bizRegNo: '1234567891', bizName: '두 번째 매장' }))
  const input = await payload(api, {}, [a, b])
  await assert.rejects(api.signup({ ...input, stores: [a, a] }), /이미 등록/)
  assert.deepEqual(await api.signup(input), { loginId: input.loginId, businessCount: 2 })
  const session = await api.login(input), stores = await api.getMyStores(session.accessToken)
  assert.equal(stores.length, 2)
  assert.equal(stores[0].name, '테스트 매장')
  assert.equal(stores[0].businessOpenedOn, '2026-01-01')
  assert.equal(loginDestination(stores), '/onboarding/store')
  assert.equal((await api.verifyBusiness(business())).status, 'DUPLICATE')
})

test('가입 요청 실패 후 같은 초안과 검증으로 재시도할 수 있다', async () => {
  const api = createAuthMock({ delayMs: 0 }), input = await payload(api, { loginId: 'retryowner' })
  await assert.rejects(api.signup(input), (error) => error.code === 'SIGNUP_UNAVAILABLE')
  assert.equal((await api.checkLoginId(input.loginId)).available, true)
  assert.equal((await api.signup(input)).businessCount, 1)
})

test('동시 가입은 하나만 생성하고 인증 만료 시 등록을 거절한다', async () => {
  const api = createAuthMock({ delayMs: 0 }), input = await payload(api)
  const results = await Promise.allSettled([api.signup(input), api.signup(input)])
  assert.equal(results.filter((result) => result.status === 'fulfilled').length, 1)
  let time = 1000
  const expiring = createAuthMock({ delayMs: 0, now: () => time }), expiredInput = await payload(expiring)
  time += 600001
  await assert.rejects(expiring.signup(expiredInput), (error) => error.code === 'PHONE_EXPIRED')
})

test('첫 매장 기본정보 저장·영업시간·휴무·소유권을 검증한다', async () => {
  const api = createAuthMock({ delayMs: 0 }), input = await payload(api)
  await api.signup(input)
  const session = await api.login(input), [store] = await api.getMyStores(session.accessToken)
  const settings = { name: '완성 매장', category: '카페', address: '서울 성동구', openTime: '09:00', closeTime: '21:00', closedDays: ['sun'] }
  await assert.rejects(api.updateStore(session.accessToken, 1, settings), (error) => error.status === 403)
  await assert.rejects(api.updateStore(session.accessToken, store.storeId, { ...settings, address: '' }), /주소/)
  const updated = await api.updateStore(session.accessToken, store.storeId, settings)
  assert.equal(updated.openHours.sun, undefined)
  assert.deepEqual(updated.openHours.mon, ['09:00', '21:00'])
  assert.equal(loginDestination(await api.getMyStores(session.accessToken)), '/')
  updated.name = '외부 변경'
  assert.equal((await api.getMyStores(session.accessToken))[0].name, settings.name)
})
