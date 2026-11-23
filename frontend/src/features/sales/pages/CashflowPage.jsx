import { Screen } from '@/components/common/layout'
import { Card, Chips, H2, HeadRow, Hero, HeroLabel, HeroValue, KV2, P, Pill, Segmented } from '@/components/common/ui'
import { won } from '@/lib/format'
import { CashWeek, WeekHeader } from '@/features/sales/components/CalendarParts'
import { SALES_TABS } from '@/features/sales/constants'
import { useCashByDay, useCashTransactions } from '@/features/sales/queries'

/** 41-1 입출금 (UF-17 5~6) */
export default function CashflowPage() {
  const { data: byDay } = useCashByDay()
  const { data: tx } = useCashTransactions()
  return (
    <Screen title="매출" back={false} tab>
      <Segmented items={['매출', '입출금']} active={1} links={SALES_TABS} />
      <Chips items={['일', '주', '월', '기간 지정']} defaultIndex={2} />
      <Hero>
        <HeroLabel>11월 순입출금 (1일~19일)</HeroLabel>
        <HeroValue size="text-[30px]">+2,184,000원</HeroValue>
        <p className="text-[13px] text-[#d9ebfa]">입금 9,820,000 · 출금 7,636,000</p>
      </Hero>
      <Card tone="line">
        <HeadRow title="입출금 캘린더" size="text-base">
          <Pill>금융 거래일 기준</Pill>
        </HeadRow>
        <WeekHeader />
        <CashWeek byDay={byDay} />
        <P tone="mute" small>
          날짜 아래 숫자는 그날 입금(+)·출금(−) 금액(원)이에요.
        </P>
      </Card>
      <Card tone="line">
        <H2>11.18 (수) 거래 내역</H2>
        {tx.map((t) => (
          <KV2
            key={t.title}
            title={t.title}
            sub={t.sub}
            value={won(t.amount, true)}
            tone={t.check ? 'amber' : t.amount > 0 ? 'deep' : 'warn'}
          />
        ))}
      </Card>
      <P tone="mute" small>
        매출(판매일 기준)과 정산 입금(거래일 기준)은 따로 보여주고 합산하지 않아요.
      </P>
    </Screen>
  )
}
