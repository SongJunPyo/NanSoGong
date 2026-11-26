import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import * as auth from '@/api/auth'
import { useAuthStore } from '@/store/useAuthStore'
import { useStoreSelection } from '@/store/useStoreSelection'
import { useSignupStore } from '@/store/useSignupStore'
import { toast } from '@/components/ui/toast'
import { firstIncompleteStore, loginDestination } from '@/utils/auth'

export const myStoresKey = (memberId) => ['auth', 'stores', memberId]
export const myMemberKey = (memberId) => ['auth', 'me', memberId]

/** 회원정보는 선택 매장이 아닌 로그인 회원 단위로 분리한다. */
export function useMyMember() {
  const user = useAuthStore((state) => state.user)
  return useQuery({ queryKey: myMemberKey(user?.memberId), queryFn: () => auth.getCurrentUser(), enabled: Boolean(user), retry: false })
}

export function useUpdateMyMember() {
  const cache = useQueryClient()
  const navigate = useNavigate()
  return useMutation({
    mutationKey: ['auth', 'update-me'], retry: false, gcTime: 0,
    mutationFn: async (input) => {
      const session = useAuthStore.getState()
      const user = await auth.updateCurrentUser(input, session.accessToken)
      return { user, token: session.accessToken, memberId: session.user?.memberId }
    },
    onSuccess: async ({ user, token, memberId }, input) => {
      const current = useAuthStore.getState()
      if (current.accessToken !== token || current.user?.memberId !== memberId) return
      if (input.password !== undefined) {
        // AuthGuard의 로그아웃 이동과 겹쳐도 완료 안내가 사라지지 않게 전역 토스트로 알린다.
        toast('비밀번호를 변경했어요. 새 비밀번호로 로그인해 주세요.', { duration: 6000 })
        useAuthStore.getState().logout()
        useStoreSelection.getState().clear()
        useSignupStore.getState().reset()
        cache.clear()
        navigate('/login', { replace: true })
      } else {
        await cache.cancelQueries({ queryKey: myMemberKey(memberId), exact: true })
        const latest = useAuthStore.getState()
        if (latest.accessToken !== token || latest.user?.memberId !== memberId) return
        useAuthStore.setState({ user })
        cache.setQueryData(myMemberKey(memberId), user)
      }
    },
  })
}

export function useMyStores() {
  const user = useAuthStore((state) => state.user)
  return useQuery({ queryKey: myStoresKey(user?.memberId), queryFn: () => auth.getMyStores(), enabled: Boolean(user) })
}

export function useLogin() {
  const cache = useQueryClient()
  const navigate = useNavigate()
  const task = useMutation({ mutationKey: ['auth', 'login'], retry: false, gcTime: 0,
    mutationFn: async (input) => {
      const session = await auth.login(input)
      let stores, user
      try { [user, stores] = await Promise.all([auth.getCurrentUser(session.accessToken), auth.getMyStores(session.accessToken)]) }
      catch (error) { await auth.logout(session.accessToken); throw error }
      cache.clear()
      useStoreSelection.getState().clear()
      useAuthStore.getState().login(session.accessToken, user)
      cache.setQueryData(myMemberKey(user.memberId), user)
      cache.setQueryData(myStoresKey(user.memberId), stores)
      const selected = firstIncompleteStore(stores) ?? stores[0]
      if (selected) useStoreSelection.getState().selectStore(selected.storeId)
      navigate(loginDestination(stores), { replace: true })
    },
  })
  return { pending: task.isPending, error: task.error, clearError: task.reset, submit: (input) => task.mutate(input) }
}

export function useLogout() {
  const cache = useQueryClient()
  const navigate = useNavigate()
  const task = useMutation({ mutationKey: ['auth', 'logout'], retry: false, gcTime: 0,
    mutationFn: async () => {
      try { await auth.logout() }
      finally {
        useAuthStore.getState().logout()
        useStoreSelection.getState().clear()
        useSignupStore.getState().reset()
        cache.clear()
        navigate('/login', { replace: true })
      }
    },
  })
  return { pending: task.isPending, error: task.error, submit: () => task.mutate() }
}
