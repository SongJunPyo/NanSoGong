import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import * as auth from '@/api/auth'
import { useAuthStore } from '@/store/useAuthStore'
import { useStoreSelection } from '@/store/useStoreSelection'
import { useSignupStore } from '@/store/useSignupStore'
import { firstIncompleteStore, loginDestination } from '@/utils/auth'
import { useAsyncAction } from './useAsyncAction'

export const myStoresKey = (memberId) => ['auth', 'stores', memberId]

export function useMyStores() {
  const user = useAuthStore((state) => state.user)
  return useQuery({ queryKey: myStoresKey(user?.memberId), queryFn: () => auth.getMyStores(), enabled: Boolean(user) })
}

export function useLogin() {
  const task = useAsyncAction()
  const cache = useQueryClient()
  const navigate = useNavigate()
  return {
    ...task,
    submit: (input) => task.run(async () => {
      const session = await auth.login(input)
      let stores, user
      try { [user, stores] = await Promise.all([auth.getCurrentUser(session.accessToken), auth.getMyStores(session.accessToken)]) }
      catch (error) { await auth.logout(session.accessToken); throw error }
      cache.clear()
      useStoreSelection.getState().clear()
      useAuthStore.getState().login(session.accessToken, user)
      cache.setQueryData(['auth', 'me', user.memberId], user)
      cache.setQueryData(myStoresKey(user.memberId), stores)
      const selected = firstIncompleteStore(stores) ?? stores[0]
      if (selected) useStoreSelection.getState().selectStore(selected.storeId)
      navigate(loginDestination(stores), { replace: true })
    }),
  }
}

export function useLogout() {
  const task = useAsyncAction()
  const cache = useQueryClient()
  const navigate = useNavigate()
  return {
    ...task,
    submit: () => task.run(async () => {
      try { await auth.logout() }
      finally {
        useAuthStore.getState().logout()
        useStoreSelection.getState().clear()
        useSignupStore.getState().reset()
        cache.clear()
        navigate('/login', { replace: true })
      }
    }),
  }
}
