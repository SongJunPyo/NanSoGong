// HTTP 경계를 주입해 Refresh 경합·이전 세션 응답·CSRF 실패를 실제 타이머 없이 검증한다.
export function createApiTransport({ base, fetcher, getSession, renewToken, expireSession, cookieLock = (work) => work() }) {
  let refreshFlight = null
  const error = (message, status, code) => Object.assign(new Error(message), { status, code })
  const unchanged = (epoch) => getSession().sessionEpoch === epoch
  const checkSession = (epoch) => { if (!unchanged(epoch)) throw error('로그인 상태가 바뀌었어요. 다시 시도해 주세요.', undefined, 'SESSION_CHANGED') }
  async function send(path, options, epoch) {
    let response
    try { response = await fetcher(`${base}${path}`, { credentials: 'include', ...options }) }
    catch { throw error('서버에 연결할 수 없습니다. 서버(8080)가 켜져 있는지 확인해 주세요.', undefined, 'NETWORK') }
    checkSession(epoch)
    const body = response.status === 204 ? null : await response.json().catch(() => null)
    checkSession(epoch)
    return { response, body }
  }
  function requireOk({ response, body }) {
    if (!response.ok) throw error(body?.message ?? `요청 실패 (${response.status})`, response.status, body?.code)
    return body
  }
  async function cookieRequest(path, epoch, options = {}) {
    const csrf = requireOk(await send('/auth/csrf', { headers: { Authorization: '' } }, epoch))
    if (!csrf?.csrfToken) throw error('요청의 보안 정보를 확인할 수 없어요.', 403, 'CSRF_MISSING')
    return requireOk(await send(path, {
      method: 'POST', ...options,
      headers: { 'Content-Type': 'application/json', Authorization: '', 'X-Nansogong-Auth': '1', 'X-CSRF-Token': csrf.csrfToken },
    }, epoch))
  }
  function refresh() {
    if (refreshFlight) return refreshFlight
    const epoch = getSession().sessionEpoch
    const flight = cookieLock(async () => {
      checkSession(epoch)
      try {
        const body = await cookieRequest('/auth/refresh', epoch)
        if (!body?.accessToken || !renewToken(body.accessToken, epoch)) throw error('로그인 상태가 바뀌었어요.', undefined, 'SESSION_CHANGED')
        return body
      } catch (failure) {
        if (failure.status === 401 && unchanged(epoch)) expireSession(epoch)
        throw failure
      }
    })
    refreshFlight = Promise.resolve(flight).finally(() => { refreshFlight = null })
    return refreshFlight
  }
  async function request(path, options = {}) {
    if (path === '/auth/refresh') return refresh()
    const initial = getSession()
    const epoch = initial.sessionEpoch
    if (path === '/auth/logout') return cookieLock(() => { checkSession(epoch); return cookieRequest(path, epoch) })
    const anonymous = path.startsWith('/auth/')
    const headers = {
      'Content-Type': 'application/json',
      ...(anonymous ? { Authorization: '' } : initial.accessToken ? { Authorization: `Bearer ${initial.accessToken}` } : {}),
      ...(path === '/auth/login' ? { 'X-Nansogong-Auth': '1' } : {}),
      ...options.headers,
    }
    const execute = () => send(path, { ...options, headers }, epoch)
    let result = path === '/auth/login' ? await cookieLock(execute) : await execute()
    const usedOwnToken = initial.accessToken && headers.Authorization === `Bearer ${initial.accessToken}`
    if (result.response.status === 401 && !anonymous && usedOwnToken) {
      const current = getSession()
      const token = current.accessToken !== initial.accessToken ? current.accessToken : (await refresh()).accessToken
      checkSession(epoch)
      headers.Authorization = `Bearer ${token}`
      result = await execute()
      if (result.response.status === 401 && unchanged(epoch)) expireSession(epoch)
    }
    return requireOk(result)
  }
  return { request, refresh }
}
