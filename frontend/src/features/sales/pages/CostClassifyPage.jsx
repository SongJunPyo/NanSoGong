import { Screen } from '@/components/common/layout'
import { Button, Card, Chips, Eyebrow, H1, KV2 } from '@/components/common/ui'
import SalesTabs from '@/features/sales/components/SalesTabs'

/** 43-2 거래 분류 확인 (UF-18 1~2) */
export default function CostClassifyPage() {
  return (
    <Screen title="매출" tab wide compact>
      <SalesTabs />
      <p className="rounded-input bg-woori-tint p-3 text-label text-woori-deep">거래 분류 시연이에요. 선택 내용은 아직 저장되거나 예상 이익 계산에 반영되지 않아요.</p>
      <Eyebrow>확인이 필요한 거래 2건</Eyebrow>
      <H1>{'이 거래는\n어떤 비용인가요?'}</H1>
      <Card tone="line">
        <KV2 title="11.15 출금 · 김○○" sub="우리은행 · 계좌이체" value="850,000원" />
        <p className="text-[13px] font-medium text-woori-blue">AI 추측: 인건비 (매월 15일 같은 금액 이체)</p>
        <Chips items={['인건비', '임대료', '거래처 대금', '개인 지출', '기타']} />
      </Card>
      <Card tone="line">
        <KV2 title="11.10 출금 · 관리비" sub="우리은행 · 자동이체" value="120,000원" />
        <p className="text-[13px] font-medium text-warning">직접 입력한 공과금 240,000원과 겹칠 수 있어요</p>
        <Chips items={['공과금에 포함', '별도 비용', '개인 지출']} />
      </Card>
      <Button to="/sales/costs">분류 예시 확인 마치기</Button>
    </Screen>
  )
}
