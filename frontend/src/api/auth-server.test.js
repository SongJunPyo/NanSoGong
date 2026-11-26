import test from 'node:test'
import assert from 'node:assert/strict'
import { createAuthApi } from './auth-server.js'

test('실제 중복 확인 응답을 화면의 available로 변환한다', async () => {
  const paths = []
  const api = createAuthApi(async (path) => { paths.push(path); return { exists: true } })
  assert.deepEqual(await api.checkLoginId('taken_owner'), { loginId: 'taken_owner', available: false })
  assert.deepEqual(paths, ['/auth/login-id/exists?loginId=taken_owner'])
})

test('가입은 서버 인증 증명과 사업자 입력만 보내고 가짜 확인 결과·소유자를 보내지 않는다', async () => {
  const calls = []
  const api = createAuthApi(async (path, options) => { calls.push({ path, body: JSON.parse(options.body) }); return { businessCount: 1 } })
  await api.signup({ loginId: 'testowner', password: 'Owner123!', name: '테스트사장', phone: '01000000000', phoneVerificationToken: 'server-proof',
    memberId: 999, stores: [{ bizRegNo: '1234567890', ownerName: '테스트대표', openingDate: '20000101', bizName: '테스트 매장', verificationToken: 'forged', verifyStatus: 'VERIFIED', memberId: 999 }] })
  assert.equal(calls[0].path, '/auth/signup')
  assert.equal(calls[0].body.phoneVerificationToken, 'server-proof')
  assert.deepEqual(calls[0].body.stores, [{ bizRegNo: '1234567890', ownerName: '테스트대표', openingDate: '20000101', bizName: '테스트 매장' }])
  assert.equal(calls[0].body.memberId, undefined)
})

test('휴대전화 요청·확인과 사업자 진위확인이 서버 경로를 사용한다', async () => {
  const calls = []
  const api = createAuthApi(async (path, options) => { calls.push({ path, body: JSON.parse(options.body) }); return {} })
  await api.requestPhoneCode({ name: '테스트사장', phone: '01000000000' })
  await api.verifyPhoneCode({ challengeId: 'server-challenge', name: '테스트사장', phone: '01000000000', code: '000000' })
  await api.verifyBusiness({ bizRegNo: '1234567890', ownerName: '테스트대표', openingDate: '20000101', bizName: '보내지 않는 상호' })
  assert.deepEqual(calls.map((call) => call.path), ['/auth/phone-verifications', '/auth/phone-verifications/server-challenge/confirmations', '/auth/business-verifications'])
  assert.deepEqual(calls[2].body, { bizRegNo: '1234567890', ownerName: '테스트대표', openingDate: '20000101' })
})

test('로그인 직후 받은 토큰으로 내 정보·매장을 조회하고 모든 페이지를 읽는다', async () => {
  const calls = []
  const api = createAuthApi(async (path, options) => {
    calls.push({ path, options })
    if (path === '/me') return { id: 7, loginId: 'testowner' }
    return { content: [{ storeId: path.includes('page=0') ? 11 : 12 }], page: { totalPages: 2 } }
  }, () => 'old-token')
  assert.equal((await api.getCurrentUser('new-token')).memberId, 7)
  assert.deepEqual(await api.getMyStores('new-token'), [{ storeId: 11 }, { storeId: 12 }])
  assert.equal(calls.length, 3)
  for (const call of calls) assert.equal(call.options.headers.Authorization, 'Bearer new-token')
})

test('서버 실패를 가짜 가입·로그인 성공으로 대체하지 않는다', async () => {
  const failure = new Error('사업자정보를 다시 확인해 주세요')
  const api = createAuthApi(async () => { throw failure })
  await assert.rejects(api.signup({ stores: [] }), (error) => error === failure)
  await assert.rejects(api.login({ loginId: 'testowner', password: 'Owner123!' }), (error) => error === failure)
})
