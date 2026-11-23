import { Link } from 'react-router-dom'
import { WeatherIcon } from '@/components/common/ui'
import { useStoreInfo } from '@/features/store/queries'

export default function StoreLine({ date, weather }) {
  const { data: store } = useStoreInfo()
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-label text-ink-sub">
        {store.name} · {date ?? store.today}
      </span>
      <Link to="/weather" className="ml-auto flex items-center gap-1">
        <WeatherIcon type={weather?.type ?? store.weather.type} size={18} />
        <span className="text-label font-bold text-ink">{weather?.label ?? store.weather.label}</span>
      </Link>
    </div>
  )
}
