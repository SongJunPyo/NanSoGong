import { Screen } from '@/components/common/layout'
import { Button, Card, Eyebrow, H1, H2, HeadRow, KV, ListRow, P, Pill } from '@/components/common/ui'

/** 06 레시피·POS 메뉴 연결 (UF-04 3~8) */
export default function RecipeConnectPage() {
  return (
    <Screen title="레시피·메뉴 연결">
      <Eyebrow>초기 설정 3/3</Eyebrow>
      <H1>{'메뉴별 레시피를\nAI가 채워뒀어요'}</H1>
      <Card>
        <H2>아이스 아메리카노</H2>
        <KV label="원두" value="18 g" />
        <KV label="컵 16oz · 뚜껑" value="1 개" />
        <KV label="예상 원가" value="820원" tone="deep" />
        <div>
          <Button variant="text">재료·사용량 수정</Button>
        </div>
      </Card>
      <Card tone="line">
        <HeadRow title="POS 메뉴 연결" size="text-base">
          <Pill tone="amber">미연결 2</Pill>
        </HeadRow>
        <ListRow title="샷 추가 (옵션)" value="연결하기" />
        <ListRow title="시즌 음료" value="연결하기" />
      </Card>
      <Card>
        <Eyebrow>에이전트가 정한 운영 기준</Eyebrow>
        <P tone="ink">판매 예측·날씨·입고 예정량·배송 기간을 반영해 품목별 목표 확보량을 정했어요.</P>
      </Card>
      <Button to="/">설정 완료하고 홈으로</Button>
    </Screen>
  )
}
