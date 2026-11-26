import { useState } from 'react'
import { Link } from 'react-router-dom'
import { RefreshCw } from 'lucide-react'
import { Screen } from '@/components/common/layout'
import { Hero, HeroLabel, HeroValue } from '@/components/common/ui'
import HomeBriefing from '@/components/home/HomeBriefing'
import HomeCalendar from '@/components/home/HomeCalendar'
import { won } from '@/lib/format'
import StoreLine from '@/features/home/components/StoreLine'
import StoreSwitcher from '@/features/home/components/StoreSwitcher'
import HomeDate from '@/features/home/components/HomeDate'
import { HeaderNotifications } from '@/components/home/HomeNotifications'
import { useAiSummary, useHome, useHomeBriefing, useHomeEvents } from '@/features/home/queries'
import { Banner } from '@/components/ui/banner'
import { Sheet } from '@/components/ui/sheet'
import { toast } from '@/components/ui/toast'
import WeatherAnalysis from '@/features/weather/components/WeatherAnalysis'
import { CoachMark } from '@/components/ui/coach-mark'

// 첫 로그인 안내 — 이 기기에서 처음 홈을 열 때 한 번만 (localStorage 에 본 기록만 남긴다)
const COACH_STEPS = [
  { target: 'home-approvals', title: '할 일', body: '승인 · 입고 확인처럼 사장님이 할 일을 급한 것부터 모아 보여 드려요.' },
  { target: 'home-sales', title: '오늘 매출', body: 'POS 매출을 실시간으로 모아 보여 드려요.' },
  { target: 'home-calendar', title: '운영 캘린더', body: '입고 · 프로모션 · 휴무 일정을 한눈에 볼 수 있어요.' },
]

/**
 * 11 홈 (UF-05) — HCI 배치: 할 일(행동) → 오늘 매출(정보) → 캘린더(계획)
 *   휴대폰에서는 위에서부터 이 순서, PC에서는 왼쪽 할 일 · 오른쪽 매출 + 캘린더
 */
export default function HomePage() {
  const home = useHome()
  const { data } = home
  const [refreshing, setRefreshing] = useState(false)
  // 오늘 매출 새로고침 — 목업은 바로 끝나서 최소 0.6초는 도는 모습을 보여 준다
  const refreshSales = async () => {
    setRefreshing(true)
    try {
      await Promise.all([home.refetch(), new Promise((resolve) => setTimeout(resolve, 600))])
      toast('오늘 매출을 새로 불러왔어요')
    } finally {
      setRefreshing(false)
    }
  }
  const updatedAt = new Date(home.dataUpdatedAt) // initialData 를 넣은 시각부터 시작
  const updatedText = `${String(updatedAt.getHours()).padStart(2, '0')}:${String(updatedAt.getMinutes()).padStart(2, '0')} 기준`
  const briefing = useHomeBriefing()
  const { data: aiSummary } = useAiSummary()
  const calendar = useHomeEvents()
  const [weatherOpen, setWeatherOpen] = useState(false)
  const todo = briefing.data ?? []

  return (
    <Screen title="오늘의 매장 운영" eyebrow={<StoreSwitcher />} headerActions={<><HomeDate /><HeaderNotifications /></>} back={false} settings tab wide compact>
      <StoreLine />
      {/* AI 요약 — 숫자는 목업 aiSummary 와 브리핑 개수에서 계산 */}
      <p className="-mt-2 text-label text-[#4B5563]">
        밤사이 {aiSummary.inventoryChecked}개 품목을 점검해 할 일 {todo.length}건을 골라 뒀어요.
      </p>
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
      <div className="grid min-w-0 items-start gap-4 md:grid-cols-2">
        {/* ① 지금 할 일 — 가장 먼저 (날씨 한 줄 포함) */}
        <HomeBriefing
          items={todo} approvals={data.approvals}
          onWeatherAnalyze={() => setWeatherOpen(true)}
          isPending={briefing.isPending} error={briefing.error}
        />
        {/* ② 오늘 매출 ③ 캘린더 */}
        <div className="flex min-w-0 flex-col gap-4">
          <div data-coach="home-sales" className="flex min-w-0">
            <Hero className="flex-1 justify-center">
              <div className="flex items-center gap-2">
                <HeroLabel>오늘 매출</HeroLabel>
                <span className="num text-caption text-[#d9ebfa]">POS {updatedText}</span>
                <button
                  type="button"
                  onClick={refreshSales}
                  disabled={refreshing}
                  aria-label={refreshing ? '오늘 매출을 불러오는 중이에요' : '오늘 매출 새로고침'}
                  className="-my-2 inline-flex size-11 items-center justify-center rounded-lg text-white/90 hover:bg-white/15 hover:text-white focus-visible:outline-2 focus-visible:outline-white disabled:opacity-70"
                >
                  <RefreshCw size={18} aria-hidden="true" className={refreshing ? 'animate-spin' : ''} />
                </button>
                <Link to="/sales" className="-my-2 -mr-2 ml-auto inline-flex min-h-11 items-center px-2 text-label font-bold text-white hover:underline">
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
          <HomeCalendar events={calendar.data ?? []} isPending={calendar.isPending} error={calendar.error} />
        </div>
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
