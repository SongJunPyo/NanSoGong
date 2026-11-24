import { Link } from 'react-router-dom'
import { Screen } from '@/components/common/layout'
import { Hero, HeroLabel, HeroValue, WeatherIcon } from '@/components/common/ui'
import HomeBriefing from '@/components/home/HomeBriefing'
import HomeCalendar from '@/components/home/HomeCalendar'
import HomeNotifications from '@/components/home/HomeNotifications'
import { useHomeNotifications } from '@/hooks/useHomeNotifications'
import { formatStoreDate } from '@/utils/format'
import { won } from '@/lib/format'
import StoreLine from '@/features/home/components/StoreLine'
import { useHome, useHomeEvents } from '@/features/home/queries'

/** 11 홈 — 매출·수요 요약, AI 운영 브리핑, 월별 운영 캘린더 (UF-05) */
export default function HomePage() {
  const { data } = useHome()
  const alerts = useHomeNotifications()
  const calendar = useHomeEvents()

  return (
    <Screen
      title="오늘의 매장 운영" back={false} settings tab wide compact
      headerActions={
        <HomeNotifications
          notifications={alerts.notifications} unreadCount={alerts.unreadCount}
          onRead={alerts.markRead} onReadAll={alerts.markAllRead}
          isPending={alerts.isPending} isSaving={alerts.isSaving} error={alerts.error}
        />
      }
    >
      <StoreLine date={formatStoreDate()} />
      <div className="grid min-w-0 gap-4 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
        <Hero className="justify-center">
          <HeroLabel>오늘 매출</HeroLabel>
          <HeroValue size="text-[32px] leading-tight lg:text-[36px]">{won(data.sales.amount)}원</HeroValue>
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-caption">
            <span className="text-[#d9ebfa]">주문 {data.sales.orders}건</span>
            <span className="ml-auto font-bold text-white">{data.sales.diff}</span>
          </div>
        </Hero>

        <section aria-label="날씨·수요 예측" className="flex min-w-0 flex-col justify-center gap-2 rounded-card bg-woori-tint p-4">
          <div className="flex items-center gap-2">
            <h2 className="text-caption font-bold text-woori-blue">날씨 · 수요 예측</h2>
            <Link to="/weather" className="ml-auto text-caption font-bold text-woori-blue">자세히 ›</Link>
          </div>
          <div>
            <p className="text-base font-bold text-ink">내일 비 · 따뜻한 라떼 수요 +22% 예상</p>
            <p className="mt-1 text-caption text-ink-sub">강수확률 90% · 최저 4°C · 최근 판매와 날씨를 반영했어요.</p>
          </div>
          <div className="grid grid-cols-5 gap-1 border-t border-woori-blue/10 pt-2">
            {data.forecast.map(({ d, w, t }) => (
              <div key={d} className="flex flex-col items-center justify-center gap-1 text-caption sm:flex-row">
                <span className="text-ink-sub">{d}</span>
                <span className="inline-flex items-center gap-1">
                  <WeatherIcon type={w} size={16} />
                  <span className="num font-bold text-ink">{t}</span>
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="grid min-w-0 items-start gap-4 md:grid-cols-2">
        <HomeBriefing
          notifications={alerts.notifications} approvals={data.approvals} results={data.results}
          onRead={alerts.markRead} isPending={alerts.isPending} error={alerts.error}
        />
        <HomeCalendar events={calendar.data ?? []} isPending={calendar.isPending} error={calendar.error} />
      </div>
    </Screen>
  )
}
