import test from 'node:test'
import assert from 'node:assert/strict'
import { emptyMember, validateMember, validateBusiness, validateStore, normalizeBusinessNumber, formatBusinessNumber, loginDestination } from './auth.js'

const member = { loginId: 'testowner', password: 'Owner123!', passwordConfirm: 'Owner123!', name: '김사장', phone: '010-1234-5678' }
const business = { bizRegNo: '123-45-67890', ownerName: '김사장', openingDate: '20260101', bizName: '테스트 매장' }

test('필수 회원정보·아이디·비밀번호 조합·확인을 검증한다', () => {
  assert.deepEqual(validateMember(member), {})
  assert.deepEqual(Object.keys(validateMember(emptyMember())).sort(), ['loginId', 'name', 'password', 'passwordConfirm', 'phone'])
  for (const password of ['short', 'onlyletters!', '12345678!', 'Password1', 'Owner 123!']) assert.ok(validateMember({ ...member, password }).password)
  assert.ok(validateMember({ ...member, passwordConfirm: 'Other123!' }).passwordConfirm)
  assert.ok(validateMember({ ...member, loginId: '1owner' }).loginId)
  assert.ok(validateMember({ ...member, name: '   ' }).name)
  assert.ok(validateMember({ ...member, phone: '010ABCD1234' }).phone)
})

test('사업자번호의 표시 형식과 실제 숫자를 분리하며 문자를 숨기지 않는다', () => {
  assert.equal(formatBusinessNumber('1234567890'), '123-45-67890')
  assert.equal(normalizeBusinessNumber('123-45-67890'), '1234567890')
  assert.deepEqual(validateBusiness(business), {})
  for (const number of ['123456789', '12345678901', '12345a7890']) assert.ok(validateBusiness({ ...business, bizRegNo: number }).bizRegNo)
})

test('개업일자는 실제 달력 날짜여야 하며 윤년을 처리한다', () => {
  assert.ok(validateBusiness({ ...business, openingDate: '20260229' }).openingDate)
  assert.ok(validateBusiness({ ...business, openingDate: '20261301' }).openingDate)
  assert.ok(validateBusiness({ ...business, openingDate: '2026-01-01' }).openingDate)
  assert.deepEqual(validateBusiness({ ...business, openingDate: '20240229' }), {})
  assert.ok(validateBusiness({ ...business, ownerName: ' ' }).ownerName)
})

test('첫 매장 필수값·선택 영업시간·야간 영업을 검증한다', () => {
  const store = { name: '매장', category: '카페', address: '서울', openTime: '', closeTime: '' }
  assert.deepEqual(validateStore(store), {})
  assert.ok(validateStore({ ...store, category: '' }).category)
  assert.ok(validateStore({ ...store, openTime: '09:00' }).openHours)
  assert.ok(validateStore({ ...store, openTime: '99:00', closeTime: '21:00' }).openHours)
  assert.deepEqual(validateStore({ ...store, openTime: '22:00', closeTime: '02:00' }), {})
})

test('매장 상태별 로그인 경로를 고른다', () => {
  const complete = { name: '매장', category: '카페', address: '서울' }
  assert.equal(loginDestination([]), '/onboarding/store')
  assert.equal(loginDestination([complete, { name: '새 매장' }]), '/onboarding/store')
  assert.equal(loginDestination([complete]), '/')
})

test('서버의 비밀번호 해시 길이 제한을 넘는 입력을 미리 안내한다', () => {
  const password = '가'.repeat(24) + 'A1!'
  assert.ok(validateMember({ ...member, password, passwordConfirm: password }).password)
  const allowed = 'A1!' + 'a'.repeat(61)
  assert.deepEqual(validateMember({ ...member, password: allowed, passwordConfirm: allowed }), {})
})
