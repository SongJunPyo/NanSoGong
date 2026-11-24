import { Link } from 'react-router-dom'
import { WeatherIcon } from '@/components/common/ui'
import { useStoreInfo } from '@/features/store/queries'

export default function StoreLine({ date, weather }) {
  const { data: store } = useStoreInfo()
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
      <span className="min-w-0 break-words text-label text-ink-sub">
        {store.name} · {date ?? store.today}
      </span>
      <Link to="/weather" className="ml-auto flex shrink-0 items-center gap-1">
        <WeatherIcon type={weather?.type ?? store.weather.type} size={18} />
        <span className="text-label font-bold text-ink">{weather?.label ?? store.weather.label}</span>
      </Link>
    </div>
  )
}
