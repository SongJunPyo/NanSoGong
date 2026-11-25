import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Screen } from '@/components/common/layout'
import { Hero, HeroLabel, HeroValue, WeatherIcon } from '@/components/common/ui'
import HomeBriefing from '@/components/home/HomeBriefing'
import HomeCalendar from '@/components/home/HomeCalendar'
import { useHomeNotifications } from '@/hooks/useHomeNotifications'
import { won } from '@/lib/format'
import StoreLine from '@/features/home/components/StoreLine'
import StoreSwitcher from '@/features/home/components/StoreSwitcher'
import HomeDate from '@/features/home/components/HomeDate'
import { HeaderNotifications } from '@/components/home/HomeNotifications'
import { useHome, useHomeEvents } from '@/features/home/queries'
import { Banner } from '@/components/ui/banner'
import { Sheet } from '@/components/ui/sheet'
import WeatherDetail from '@/features/weather/components/WeatherDetail'
import { CoachMark } from '@/components/ui/coach-mark'

// 첫 로그인 안내 — 이 기기에서 처음 홈을 열 때 한 번만 (localStorage 에 본 기록만 남긴다)
const COACH_STEPS = [
  { target: 'home-sales', title: '오늘 매출', body: 'POS 매출을 실시간으로 모아 보여 드려요.' },
  { target: 'home-approvals', title: '할 일', body: '승인 · 입고 확인처럼 사장님이 할 일을 모아 보여 드려요.' },
  { target: 'home-calendar', title: '운영 캘린더', body: '입고 · 프로모션 · 휴무 일정을 한눈에 볼 수 있어요.' },
]

/** 11 홈 — 매출·수요 요약, AI 운영 브리핑, 월별 운영 캘린더 (UF-05) */
export default function HomePage() {
  const { data } = useHome()
  const alerts = useHomeNotifications()
  const calendar = useHomeEvents()
  const [weatherOpen, setWeatherOpen] = useState(false)
  // 긴급 알림이 있을 때만 매출보다 위에 배너로 (가장 최근 1건)
  const urgent = alerts.notifications.find((n) => n.severity === 'urgent')
  const urgentAction = urgent && data.approvals.find((a) => a.to === urgent.to)

  return (
    <Screen title="오늘의 매장 운영" eyebrow={<StoreSwitcher />} headerActions={<><HomeDate /><HeaderNotifications /></>} back={false} settings tab wide compact>
      <StoreLine />
      {urgent && (
        <Banner
          key={urgent.id}
          tone="danger"
          title={urgent.title}
          dismissKey={`home-urgent-${urgent.id}`}
          dismissFor="day"
          action={
            <Link to={urgent.to} onClick={() => alerts.markRead(urgent.id)}>
              {urgentAction ? `${urgentAction.title} · ${urgentAction.value} ›` : '바로 확인하기 ›'}
            </Link>
          }
        >
          {urgent.description}
        </Banner>
      )}
      {/* 닫으면 같은 주에는 다시 띄우지 않는다 */}
      {data.orderFund && data.orderFund.planned > data.orderFund.balance && (
        <Banner
          tone="warn"
          title="이번 주 발주 자금이 부족할 것 같아요"
          dismissKey="home-order-fund"
          dismissFor="week"
          action={<Link to="/sales/cashflow">입출금 보기 ›</Link>}
        >
          발주 예정 {won(data.orderFund.planned)}원 · 통장 잔액 {won(data.orderFund.balance)}원
        </Banner>
      )}
      <div className="grid min-w-0 gap-4 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
        <div data-coach="home-sales" className="flex min-w-0">
          <Hero className="flex-1 justify-center">
            <HeroLabel>오늘 매출</HeroLabel>
            <HeroValue size="text-[32px] leading-tight lg:text-[36px]">{won(data.sales.amount)}원</HeroValue>
            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-caption">
              <span className="text-[#d9ebfa]">주문 {data.sales.orders}건</span>
              <span className="ml-auto font-bold text-white">{data.sales.diff}</span>
            </div>
          </Hero>
        </div>

        <section aria-label="날씨·수요 예측" className="flex min-w-0 flex-col justify-center gap-2 rounded-card bg-woori-tint p-4">
          <div className="flex items-center gap-2">
            <h2 className="text-caption font-bold text-woori-blue">날씨 · 수요 예측</h2>
            <button type="button" onClick={() => setWeatherOpen(true)} className="ml-auto text-caption font-bold text-woori-blue">자세히 ›</button>
          </div>
          <div>
            <p className="text-base font-bold text-ink">내일 비 · 따뜻한 라떼 14잔 더 팔릴 것 같아요</p>
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
          notifications={alerts.notifications} approvals={data.approvals}
          onRead={alerts.markRead} isPending={alerts.isPending} error={alerts.error}
        />
        <HomeCalendar events={calendar.data ?? []} isPending={calendar.isPending} error={calendar.error} />
      </div>
      {/* 날씨는 화면 이동 없이 팝업으로 */}
      <Sheet open={weatherOpen} onOpenChange={setWeatherOpen} title="날씨·수요 예측" description="성수동 기준 · 기상청 예보">
        <div className="pb-4">
          <WeatherDetail onNavigate={() => setWeatherOpen(false)} />
        </div>
      </Sheet>
      <CoachMark storageKey="home-first-v1" steps={COACH_STEPS} enabled={!alerts.isPending && !calendar.isPending} />

    </Screen>
  )
}
