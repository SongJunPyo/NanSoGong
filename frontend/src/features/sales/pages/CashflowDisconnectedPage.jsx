import { Screen } from '@/components/common/layout'
import { Button, Card, Chips, HeadRow, Hero, HeroLabel, HeroValue, P, Pill, Segmented } from '@/components/common/ui'
import { CashWeek, WeekHeader } from '@/features/sales/components/CalendarParts'
import { SALES_TABS } from '@/features/sales/constants'
import { useCashByDay } from '@/features/sales/queries'

/** 41-2 입출금 — 금융 연동 실패 (UF-17 분기) */
export default function CashflowDisconnectedPage() {
  const { data: byDay } = useCashByDay()
  return (
    <Screen title="매출" back={false} tab>
      <Segmented items={['매출', '입출금']} active={1} links={SALES_TABS} />
      <Chips items={['일', '주', '월', '기간 지정']} defaultIndex={2} />
      <Card tone="warn">
        <HeadRow title="금융 연동이 끊겼어요" size="text-base">
          <Pill tone="warnWhite">11.17 23:00부터</Pill>
        </HeadRow>
        <P tone="ink">그 뒤 입출금은 ‘확인 불가’로 보여드려요. 매출 보기와 직접 입력한 비용은 계속 볼 수 있어요.</P>
        <Button to="/settings/integrations">다시 연결</Button>
      </Card>
      <Hero>
        <HeroLabel>11월 순입출금 (확인된 1일~17일)</HeroLabel>
        <HeroValue size="text-[30px]">+1,972,000원</HeroValue>
        <p className="text-[13px] text-[#d9ebfa]">11.18 이후는 확인 불가</p>
      </Hero>
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
