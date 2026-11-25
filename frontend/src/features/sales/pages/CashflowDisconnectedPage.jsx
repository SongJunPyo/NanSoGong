import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Screen } from '@/components/common/layout'
import { Button, Card, Chips, HeadRow, Hero, HeroLabel, HeroValue, P, Pill, Segmented } from '@/components/common/ui'
import { CashWeek, WeekHeader } from '@/features/sales/components/CalendarParts'
import { SALES_TAB_LABELS, SALES_TABS } from '@/features/sales/constants'
import { useCashByDay } from '@/features/sales/queries'
import { EmptyState } from '@/components/ui/empty-state'
import { ButtonLoading } from '@/components/ui/loading'
import { toast } from '@/components/ui/toast'

/** 41-2 입출금 — 금융 연동 실패 (UF-17 분기) */
export default function CashflowDisconnectedPage() {
  const { data: byDay } = useCashByDay()
  const navigate = useNavigate()
  const [retrying, setRetrying] = useState(false)

  // TODO API 가 생기면 금융 연동 재연결 요청으로 바꾼다 (목업: 성공으로 보고 입출금 화면으로)
  const retry = () => {
    setRetrying(true)
    setTimeout(() => {
      toast('금융 연동을 다시 연결했어요')
      navigate('/sales/cashflow')
    }, 900)
  }
  return (
    <Screen title="매출" back={false} tab wide>
      <div className="grid gap-3 xl:grid-cols-[1fr_minmax(0,24rem)_1fr] xl:items-center">
        <div className="mx-auto w-full md:max-w-sm xl:col-start-2">
          <Segmented items={SALES_TAB_LABELS} active={1} links={SALES_TABS} />
        </div>
        <div className="md:justify-self-end">
          <Chips items={['일', '주', '월', '기간 지정']} defaultIndex={2} />
        </div>
      </div>
      <div className="grid min-w-0 gap-4 md:grid-cols-2 lg:gap-6">
        <Card tone="warn" pad="p-2">
          <EmptyState
            kind="error"
            compact
            title="금융 연동이 끊겼어요"
            description={'11.17 23:00부터 입출금을 확인하지 못했어요.\n매출과 직접 입력한 비용은 계속 볼 수 있어요.'}
            action={
              <ButtonLoading loading={retrying} loadingText="다시 연결하고 있어요" onClick={retry}>
                다시 시도
              </ButtonLoading>
            }
            secondaryAction={
              <Button variant="outline" to="/settings/integrations">
                연동 관리
              </Button>
            }
          />
        </Card>
        <Hero className="justify-center">
          <HeroLabel>11월 순입출금 (확인된 1일~17일)</HeroLabel>
          <HeroValue size="text-[30px]">+1,972,000원</HeroValue>
          <p className="text-[13px] text-[#d9ebfa]">11.18 이후는 확인 불가</p>
        </Hero>
      </div>
      <Card tone="line">
        <HeadRow title="입출금 캘린더" size="text-base">
          <Pill>금융 거래일 기준</Pill>
        </HeadRow>
        <WeekHeader />
        <CashWeek byDay={byDay} unknownFrom={18} />
        <P tone="mute" small>
          회색 날짜는 연동이 끊겨서 금액을 확인하지 못한 날이에요. 0원이 아니에요.
        </P>
      </Card>
    </Screen>
  )
}
