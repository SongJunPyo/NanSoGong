import test from 'node:test'
import assert from 'node:assert/strict'
import { storeFormValues, hasUniformStoreHours } from './store.js'

const week = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
const schedule = (days = week, from = '09:00', to = '21:00') => Object.fromEntries(days.map((day) => [day, [from, to]]))

test('조회한 매장명과 야간 영업시간·휴무를 보존하고 수정 초안은 원본 배열과 분리한다', () => {
  const store = { name: '검증 매장', category: '카페', address: '검증 주소', openHours: schedule(week.slice(0, 6), '22:00', '02:00'), closedDays: ['sun'] }
  const values = storeFormValues(store)
  assert.deepEqual(values, { name: '검증 매장', category: '카페', address: '검증 주소', openTime: '22:00', closeTime: '02:00', closedDays: ['sun'] })
  values.closedDays.push('sat')
  assert.deepEqual(store.closedDays, ['sun'])
  assert.equal(hasUniformStoreHours(store), true)
})

test('설정하지 않은 값은 예시 매장이나 영업시간으로 채우지 않는다', () => {
  assert.deepEqual(storeFormValues({}), { name: '', category: '', address: '', openTime: '', closeTime: '', closedDays: [] })
  assert.equal(hasUniformStoreHours({}), true)
  assert.equal(hasUniformStoreHours({ closedDays: [...week] }), true)
})

test('요일별로 다른 시간표와 일부 요일만 등록된 시간표는 공통 시간 적용 확인이 필요하다', () => {
  assert.equal(hasUniformStoreHours({ openHours: { ...schedule(), sun: ['10:00', '18:00'] }, closedDays: [] }), false)
  assert.equal(hasUniformStoreHours({ openHours: schedule(['mon', 'tue']), closedDays: [] }), false)
  assert.equal(hasUniformStoreHours({ openHours: schedule(week.slice(0, 6)), closedDays: [] }), false)
  assert.equal(hasUniformStoreHours({ openHours: schedule(), closedDays: ['sun'] }), false)
})

test('요일 순서와 무관하게 실제 PUT 결과와 같은 시간표만 공통 영업시간으로 판단한다', () => {
  assert.equal(hasUniformStoreHours({ openHours: schedule([...week].reverse()) }), true)
  assert.equal(hasUniformStoreHours({ openHours: { mon: ['09:00'] } }), false)
  assert.equal(hasUniformStoreHours({ openHours: { ...schedule(), extra: ['09:00', '21:00'] } }), false)
})
