import { useCallback, useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import * as auth from '@/api/auth'
import { useAuthStore } from '@/store/useAuthStore'
import { useStoreSelection } from '@/store/useStoreSelection'
import { firstIncompleteStore } from '@/utils/auth'

let flight = null

// StrictMode·로그인/보호 화면이 동시에 시작되어도 쿠키 갱신과 DB 재조회는 한 번만 실행한다.
async function restore(cache) {
  if (useAuthStore.getState().ready) return
  if (flight) return flight
  const epoch = useAuthStore.getState().sessionEpoch
  const current = () => useAuthStore.getState().sessionEpoch === epoch
  flight = (async () => {
    try {
      const session = await auth.refreshSession()
      const [user, stores] = await Promise.all([auth.getCurrentUser(session.accessToken), auth.getMyStores(session.accessToken)])
      if (!current()) return
      cache.clear()
      cache.setQueryData(['auth', 'me', user.memberId], user)
      cache.setQueryData(['auth', 'stores', user.memberId], stores)
      const saved = useStoreSelection.getState().storeId
      const selected = stores.find(store => store.storeId === saved) ?? firstIncompleteStore(stores) ?? stores[0]
      useStoreSelection.getState().selectStore(selected?.storeId ?? null)
      useAuthStore.setState({ user, ready: true })
    } catch (error) {
      if (error.status === 401) {
        if (current()) useAuthStore.getState().logout()
        return
      }
      if (error.code !== 'SESSION_CHANGED' && current()) throw error
    }
  })().finally(() => { flight = null })
  return flight
}
export function useSessionRestore() {
  const cache = useQueryClient()
  const ready = useAuthStore((state) => state.ready)
  const [error, setError] = useState(null)
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    let mounted = true
    if (!ready) restore(cache).catch(failure => { if (mounted) setError(failure) })
    return () => { mounted = false }
  }, [ready, cache, attempt])
  useEffect(() => useAuthStore.subscribe((state, previous) => {
    if (state.user === null && previous.user !== null) cache.clear()
  }), [cache])
  const retry = useCallback(() => { setError(null); setAttempt(value => value + 1) }, [])
  return { ready, error, retry }
}
