import { Screen } from '@/components/common/layout'
import SalesTabs from '@/features/sales/components/SalesTabs'
import SalesCalendar from '@/features/sales/components/SalesCalendar'

/** 기존 캘린더 바로가기 주소도 같은 매출 캘린더를 사용한다. */
export default function SalesCalendarPage() {
  return (
    <Screen title="매출 캘린더" tab wide>
      <SalesTabs />
      <SalesCalendar />
    </Screen>
  )
}
