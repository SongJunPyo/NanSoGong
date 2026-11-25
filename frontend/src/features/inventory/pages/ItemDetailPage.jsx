import { useParams } from 'react-router-dom'
import { CloudRain } from 'lucide-react'
import { Screen } from '@/components/common/layout'
import { Button, ButtonRow, Card, Eyebrow, H2, KV } from '@/components/common/ui'
import { useInventory } from '@/features/inventory/queries'

/** 22 품목 상세 (UF-10 3 · UF-09 6) */
export default function ItemDetailPage() {
  const { id } = useParams()
  const { data: items } = useInventory()
  // 제목은 저장된 품목명 (아래 수치는 아직 우유 1L 목업 예시)
  const name = items.find((i) => i.id === id)?.name ?? '우유 1L'
  return (
    <Screen title={name}>
      <Card>
        <Eyebrow>현재 상태</Eyebrow>
        <div className="flex items-baseline gap-1.5">
          <span className="num text-[30px] font-bold text-woori-deep">4개</span>
          <span className="text-label text-ink-sub">추정 재고</span>
        </div>
        <KV label="예상 소진" value="내일 오전" tone="warn" />
        <KV label="최근 실사" value="11.15" />
      </Card>
      <Card tone="line">
        <H2>입고분별 잔량</H2>
        <KV label="11.14 입고 · ~11.22" value="3개" />
        <KV label="11.17 입고 · ~11.25" value="1개" />
      </Card>
      <Card>
        <H2>에이전트가 정한 운영 기준</H2>
        <KV label="목표 확보 기간" value="3일" />
        <KV label="최소 보유량" value="8개" />
        <KV label="하루 평균 사용" value="3.4개" />
        <p className="flex items-center gap-1.5 text-[13px] font-medium text-woori-blue">
          <CloudRain size={18} className="text-weather-rain" /> 비 오는 날은 기준을 18% 높여 계산해요
        </p>
      </Card>
      <ButtonRow>
        <Button variant="outline" to="/inventory/adjust">
          실사·폐기
        </Button>
        <Button to="/orders/recommendation">발주 추천</Button>
      </ButtonRow>
    </Screen>
  )
}
