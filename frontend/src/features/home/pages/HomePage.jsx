import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Sparkles } from 'lucide-react'
import { Screen } from '@/components/common/layout'
import { Hero, HeroLabel, HeroValue, WeatherIcon } from '@/components/common/ui'
import HomeBriefing from '@/components/home/HomeBriefing'
import HomeCalendar from '@/components/home/HomeCalendar'
import { won } from '@/lib/format'
import StoreLine from '@/features/home/components/StoreLine'
import StoreSwitcher from '@/features/home/components/StoreSwitcher'
import HomeDate from '@/features/home/components/HomeDate'
import { HeaderNotifications } from '@/components/home/HomeNotifications'
import { useAiSummary, useHome, useHomeBriefing, useHomeEvents } from '@/features/home/queries'
import { AiLabel } from '@/components/ui/ai-label'
import { Banner } from '@/components/ui/banner'
import { Sheet } from '@/components/ui/sheet'
import WeatherAnalysis from '@/features/weather/components/WeatherAnalysis'
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
  const briefing = useHomeBriefing()
  const { data: aiSummary } = useAiSummary()
  const calendar = useHomeEvents()
  const [weatherOpen, setWeatherOpen] = useState(false)
  const todo = briefing.data ?? []
  // 긴급 할 일 중 AI가 안을 만들어 둔 것만 매출보다 위에 배너로 (승인은 사장님이 해당 화면에서)
  const urgent = todo.find((item) => item.severity === 'urgent' && item.aiDraft)

  return (
    <Screen title="오늘의 매장 운영" eyebrow={<StoreSwitcher />} headerActions={<><HomeDate /><HeaderNotifications /></>} back={false} settings tab wide compact>
      <StoreLine />
      {/* AI 요약 — 숫자는 목업 aiSummary 와 브리핑 개수에서 계산 */}
      <p className="-mt-2 text-label text-ink-sub">
        밤사이 AI가 재고 {aiSummary.inventoryChecked}개 품목을 점검하고, 확인할 일 {todo.length}건을 골라 뒀어요.
      </p>
      {/* 닫으면 같은 날에는 다시 띄우지 않는다 */}
      {urgent && (
        <Banner
          key={urgent.id}
          tone="danger"
          title={
            <span className="inline-flex flex-wrap items-center gap-1.5">
              <AiLabel />
              {urgent.aiDraft.title}
            </span>
          }
          dismissKey={`home-urgent-${urgent.id}`}
          dismissFor="day"
          action={
            <div className="flex flex-wrap gap-2">
              <Link
                to={urgent.aiDraft.basisTo}
                className="inline-flex h-9 items-center rounded-lg border border-danger/30 bg-white px-3 text-label font-bold text-danger"
              >
                근거 보기
              </Link>
              <Link to={urgent.to} className="inline-flex h-9 items-center rounded-lg bg-danger px-3 text-label font-bold text-white">
                승인하기
              </Link>
            </div>
          }
        >
          <p>{urgent.aiDraft.summary}</p>
          <p className="num mt-1 font-bold text-ink">{urgent.aiDraft.amount}</p>
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
            <div className="flex items-center gap-2">
              <HeroLabel>오늘 매출</HeroLabel>
              <Link to="/sales" className="ml-auto text-caption font-bold text-white/90 hover:text-white">
                더보기 ›
              </Link>
            </div>
            <HeroValue size="text-[32px] leading-tight lg:text-[36px]">{won(data.sales.amount)}원</HeroValue>
            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-caption">
              <span className="text-[#d9ebfa]">주문 {data.sales.orders}건</span>
              <span className="ml-auto font-bold text-white">{data.sales.diff}</span>
            </div>
          </Hero>
        </div>

        <section aria-label="날씨 데이터 기반 수요 예측" className="flex min-w-0 flex-col justify-center gap-2 rounded-card bg-woori-tint p-4">
          <div className="flex items-center gap-2">
            <h2 className="flex items-center gap-1.5 text-caption font-bold text-woori-blue">
              날씨 데이터 기반 수요 예측 <AiLabel />
            </h2>
            <button
              type="button"
              onClick={() => setWeatherOpen(true)}
              className="ml-auto inline-flex items-center gap-1 rounded-lg bg-woori-blue px-2.5 py-1.5 text-caption font-bold text-white hover:bg-woori-deep"
            >
              <Sparkles size={14} aria-hidden="true" />
              AI 분석
            </button>
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
          items={todo} approvals={data.approvals} aiSummary={aiSummary}
          isPending={briefing.isPending} error={briefing.error}
        />
        <HomeCalendar events={calendar.data ?? []} isPending={calendar.isPending} error={calendar.error} />
      </div>
      {/* 날씨 데이터 기반 수요 예측 — 화면 이동 없이 팝업에서 분석 과정 → 결과 */}
      <Sheet open={weatherOpen} onOpenChange={setWeatherOpen} title="날씨 데이터 기반 수요 예측" description="성수동 기준 · 기상청 예보">
        {/* 열 때마다 처음부터 분석 과정을 보여 준다 */}
        {weatherOpen && <WeatherAnalysis onNavigate={() => setWeatherOpen(false)} />}
      </Sheet>
      <CoachMark storageKey="home-first-v1" steps={COACH_STEPS} enabled={!briefing.isPending && !calendar.isPending} />

    </Screen>
  )
}
