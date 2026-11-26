import test from 'node:test'
import assert from 'node:assert/strict'
import { createApiTransport } from './auth-transport.js'

const response = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r }); return { promise, resolve } }
function harness(handler, extra = {}) {
  let state = { accessToken: 'old-access', sessionEpoch: 0 }
  const calls = [], counters = { renewed: 0, expired: 0 }
  const transport = createApiTransport({
    base: 'http://test/api', getSession: () => state,
    fetcher: async (url, options) => { const path = url.replace('http://test/api', ''); calls.push({ path, options }); return handler(path, options, state) },
    renewToken: (token, epoch) => { if (state.sessionEpoch !== epoch) return false; counters.renewed++; state = { ...state, accessToken: token }; return true },
    expireSession: (epoch) => { if (state.sessionEpoch === epoch) { counters.expired++; state = { accessToken: null, sessionEpoch: epoch + 1 } } },
    ...extra,
  })
  return { ...transport, calls, counters, state: () => state, switchSession: () => { state = { accessToken: 'other-access', sessionEpoch: state.sessionEpoch + 1 } } }
}

test('동시에 만료된 요청은 한 번 갱신하고 새 Access로 각각 한 번 재시도한다', async () => {
  const h = harness((path, options) => path === '/auth/csrf' ? response({ csrfToken: 'csrf-only' }) : path === '/auth/refresh' ? response({ accessToken: 'new-access' }) : options.headers.Authorization === 'Bearer new-access' ? response({ path }) : response({ message: 'expired' },401))
  assert.deepEqual(await Promise.all([h.request('/me'), h.request('/stores')]), [{ path: '/me' },{ path: '/stores' }])
  assert.equal(h.calls.filter(c => c.path === '/auth/refresh').length,1)
  assert.equal(h.calls.filter(c => c.path === '/auth/csrf').length,1)
  assert.equal(h.state().accessToken,'new-access')
  assert.deepEqual(h.counters,{ renewed: 1, expired: 0 })
  const refresh = h.calls.find(c => c.path === '/auth/refresh')
  assert.equal(refresh.options.headers.Authorization,'')
  assert.equal(refresh.options.headers['X-CSRF-Token'],'csrf-only')
  assert.equal(refresh.options.headers['X-Nansogong-Auth'],'1')
  assert.equal(refresh.options.credentials,'include')
})

test('갱신 거절은 세션을 한 번만 지우고 원래 요청을 성공으로 대체하지 않는다', async () => {
  const h = harness(path => path === '/auth/csrf' ? response({message:'다시 로그인'},401) : response({},401))
  const result = await Promise.allSettled([h.request('/me'),h.request('/stores')])
  assert.ok(result.every(r=>r.status==='rejected'))
  assert.equal(h.counters.expired,1)
  assert.equal(h.calls.filter(c=>c.path==='/auth/refresh').length,0)
})

test('이전 계정의 늦은 401·성공 응답은 새 계정을 변경하거나 종료하지 않는다', async () => {
  for(const status of [200,401]) {
    const late=deferred(); const h=harness(()=>late.promise)
    const pending=h.request('/me'); h.switchSession(); late.resolve(response({name:'old account'},status))
    await assert.rejects(pending,error=>error.code==='SESSION_CHANGED')
    assert.equal(h.state().accessToken,'other-access'); assert.equal(h.counters.expired,0)
  }
})

test('로그아웃·계정 변경 후 도착한 Refresh는 세션을 되살리지 않는다', async () => {
  const late=deferred(); const entered=deferred()
  const h=harness(path=> { if(path==='/auth/csrf') return response({csrfToken:'csrf'}); entered.resolve(); return late.promise })
  const refresh=h.refresh(); await entered.promise; h.switchSession(); late.resolve(response({accessToken:'stale-access'}))
  await assert.rejects(refresh,error=>error.code==='SESSION_CHANGED')
  assert.equal(h.counters.renewed,0); assert.equal(h.state().accessToken,'other-access')
})

test('다른 요청이 먼저 갱신했다면 늦은 401은 현재 토큰으로 재시도한다',async()=>{
  const late=deferred(); let held=false
  const h=harness((path,options)=>{
    if(path==='/auth/csrf') return response({csrfToken:'csrf'})
    if(path==='/auth/refresh') return response({accessToken:'new-access'})
    if(path==='/slow'&&!held){held=true;return late.promise}
    return options.headers.Authorization==='Bearer new-access'?response({ok:true}):response({},401)
  })
  const slow=h.request('/slow'); await h.request('/me'); late.resolve(response({},401)); await slow
  assert.equal(h.calls.filter(c=>c.path==='/auth/refresh').length,1)
})

test('로그인 오류와 익명 재설정·별도 토큰 조회는 자동 갱신·세션 종료를 하지 않는다',async()=>{
  const h=harness(()=>response({message:'입력 확인'},401))
  for(const [path,options] of [['/auth/login',{method:'POST'}],['/auth/password-resets',{method:'POST'}],['/me',{headers:{Authorization:'Bearer login-response-token'}}]]) {
    await assert.rejects(h.request(path,options),/입력 확인/)
  }
  assert.equal(h.counters.expired,0); assert.equal(h.calls.length,3)
  assert.equal(h.calls[0].options.headers['X-Nansogong-Auth'],'1')
})

test('CSRF 누락·오류를 성공이나 개발용 값으로 대체하지 않는다',async()=>{
  const missing=harness(()=>response({}))
  await assert.rejects(missing.request('/auth/logout',{method:'POST'}),error=>error.code==='CSRF_MISSING')
  assert.equal(missing.calls.length,1)
  const denied=harness(path=>path==='/auth/csrf'?response({csrfToken:'csrf'}):response({message:'보안 정보 확인'},403))
  await assert.rejects(denied.refresh(),/보안 정보 확인/)
  assert.equal(denied.counters.expired,0)
})

test('갱신 뒤에도 401이면 재시도를 끝내고 세션을 종료한다',async()=>{
  const h=harness(path=>path==='/auth/csrf'?response({csrfToken:'csrf'}):path==='/auth/refresh'?response({accessToken:'new-access'}):response({message:'종료'},401))
  await assert.rejects(h.request('/me'),/종료/)
  assert.equal(h.calls.filter(c=>c.path==='/me').length,2);assert.equal(h.counters.expired,1)
})

test('네트워크 장애를 로그아웃 완료로 처리하지 않는다',async()=>{
  const h=harness(()=>{throw new Error('offline')})
  await assert.rejects(h.request('/auth/logout',{method:'POST'}),error=>error.code==='NETWORK')
  assert.equal(h.counters.expired,0)
})

test('쿠키 작업은 CSRF 조회와 변경 요청을 한 잠금 안에서 직렬화한다',async()=>{
  let queue=Promise.resolve(), generation=0
  const h=harness((path,options)=>{
    if(path==='/auth/csrf') return response({csrfToken:'csrf-'+generation})
    assert.equal(options.headers['X-CSRF-Token'],'csrf-'+generation);generation++
    return path==='/auth/refresh'?response({accessToken:'new-access'}):new Response(null,{status:204})
  },{cookieLock:(work)=>{const result=queue.then(work);queue=result.catch(()=>{});return result}})
  await Promise.all([h.refresh(),h.request('/auth/logout',{method:'POST'})])
  assert.deepEqual(h.calls.map(c=>c.path),['/auth/csrf','/auth/refresh','/auth/csrf','/auth/logout'])
})

test('JSON 본문을 읽는 사이 계정이 바뀌어도 이전 정보는 반환하지 않는다',async()=>{
  const body=deferred(), entered=deferred()
  const h=harness(()=>({status:200,ok:true,json:()=>{entered.resolve();return body.promise}}))
  const request=h.request('/me');await entered.promise;h.switchSession();body.resolve({name:'old account'})
  await assert.rejects(request,error=>error.code==='SESSION_CHANGED')
})
