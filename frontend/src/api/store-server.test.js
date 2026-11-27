import test from 'node:test'
import assert from 'node:assert/strict'
import { createStoreApi } from './store-server.js'

test('선택한 매장을 조회·수정·다시 조회하고 다른 매장은 유지한다', async () => {
  const records = new Map([[11, { storeId: 11, name: '검증 매장 A', category: '카페', address: '검증 주소 A' }], [12, { storeId: 12, name: '검증 매장 B' }]])
  const calls = []
  const api = createStoreApi(async (path, options) => {
    calls.push({ path, options })
    const id = Number(path.split('/').at(-1))
    if (options.method === 'PUT') records.set(id, { ...records.get(id), ...JSON.parse(options.body) })
    return structuredClone(records.get(id))
  })
  const before = await api.getStore(11)
  const updated = await api.updateStoreBasics(11, { ...before, name: '수정한 검증 매장', openTime: '22:00', closeTime: '02:00', closedDays: ['sun'] })
  assert.equal(updated.name, '수정한 검증 매장')
  assert.deepEqual(await api.getStore(11), updated)
  assert.equal(records.get(12).name, '검증 매장 B')
  assert.deepEqual(calls.map(({ path }) => path), ['/stores/11', '/stores/11', '/stores/11'])
  assert.equal(calls[1].options.method, 'PUT')
})

test('회원·사업자번호·권한·원본 시간표는 수정 본문으로 보내지 않는다', async () => {
  let body
  const api = createStoreApi(async (_, options) => { body = JSON.parse(options.body); return {} })
  await api.updateStoreBasics(11, {
    name: '검증 매장', category: '카페', address: '검증 주소', openTime: '', closeTime: '', closedDays: [],
    storeId: 99, memberId: 99, bizRegNo: '0000000000', bizName: '변조 상호', ownerName: '변조 대표', verifyStatus: 'VERIFIED', openHours: { mon: ['00:00', '23:59'] },
  })
  assert.deepEqual(body, { name: '검증 매장', category: '카페', address: '검증 주소', openTime: '', closeTime: '', closedDays: [] })
})

test('매장 전환의 조회 취소 신호를 전송 계층에 전달한다', async () => {
  const controller = new AbortController()
  const api = createStoreApi(async (_, options) => {
    assert.equal(options.signal, controller.signal)
    controller.abort()
    assert.equal(options.signal.aborted, true)
    return { storeId: 11 }
  })
  await api.getStore(11, { signal: controller.signal })
})

test('다른 회원 매장의 403과 저장 실패를 성공이나 예시 값으로 바꾸지 않는다', async () => {
  const denied = Object.assign(new Error('내 매장만 조회·수정할 수 있어요'), { status: 403 })
  const api = createStoreApi(async () => { throw denied })
  await assert.rejects(api.getStore(99), (error) => error === denied)
  await assert.rejects(api.updateStoreBasics(99, { name: '저장 실패 입력' }), (error) => error === denied)
})
