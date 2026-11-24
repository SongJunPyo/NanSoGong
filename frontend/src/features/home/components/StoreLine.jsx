import { useStoreInfo } from '@/features/store/queries'

export default function StoreLine({ date }) {
  const { data: store } = useStoreInfo()
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
      <span className="min-w-0 break-words text-label text-ink-sub">
        {store.name} · {date ?? store.today}
      </span>
    </div>
  )
}
