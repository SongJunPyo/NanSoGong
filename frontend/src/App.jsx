import { useQuery } from '@tanstack/react-query'
import { pingApi } from '@/api/client'

// 배포할 때 Actions 가 VITE_APP_ENV=dev / prod 를 넣는다. 내 PC 에서는 local
const APP_ENV = import.meta.env.VITE_APP_ENV ?? 'local'

// 🩺 첫 화면 = 환경 세팅 확인판. 네 줄이 모두 초록이면 세팅 완료
// 실제 기능 화면을 만들기 시작하면 이 컴포넌트는 지우거나 /dev 같은 주소로 옮긴다
export default function App() {
  const { data, error, isPending, refetch } = useQuery({
    queryKey: ['ping'],
    queryFn: pingApi,
  })

  const rows = [
    { label: 'Spring Boot 서버 (8080)', value: data?.server },
    { label: 'PostgreSQL', value: data?.postgres },
    { label: 'Redis', value: data?.redis },
    { label: '외부 연동 목업 (8089)', value: data?.mock },
  ]

  return (
    <main className="mx-auto max-w-md p-6">
      <h1 className="text-2xl font-bold text-[#2b62a8]">
        난소공
        {/* 어느 환경 화면인지 헷갈리지 않게 (운영 prod 에서는 표시하지 않는다) */}
        {APP_ENV !== 'prod' && (
          <span className="ml-2 rounded bg-amber-100 px-2 py-0.5 align-middle text-xs text-amber-700">
            {APP_ENV.toUpperCase()}
          </span>
        )}
      </h1>
      <p className="mt-1 text-sm text-gray-500">개발 환경 연결 확인</p>

      <ul className="mt-6 space-y-3">
        {rows.map(({ label, value }) => {
          const ok = value && !value.startsWith('연결 실패')
          return (
            <li key={label} className="rounded-xl border p-4">
              <div className="flex items-center justify-between">
                <span className="font-medium">{label}</span>
                <span className={ok ? 'text-green-600' : 'text-red-600'}>
                  {isPending ? '확인 중…' : ok ? '연결됨' : '실패'}
                </span>
              </div>
              {value && <p className="mt-1 truncate text-xs text-gray-400">{value}</p>}
            </li>
          )
        })}
      </ul>

      {error && <p className="mt-4 text-sm text-red-600">{error.message}</p>}

      <button
        onClick={() => refetch()}
        className="mt-6 w-full rounded-xl bg-[#2b62a8] py-3 font-medium text-white"
      >
        다시 확인
      </button>
    </main>
  )
}
