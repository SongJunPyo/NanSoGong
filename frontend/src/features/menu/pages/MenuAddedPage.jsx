import { Screen } from '@/components/common/layout'
import { Button, Card, Eyebrow, H1, H2, KV, ListRow, P } from '@/components/common/ui'

/** 35 메뉴 추가 완료 (UF-16 5) */
export default function MenuAddedPage() {
  return (
    <Screen title="메뉴 추가">
      <Eyebrow>등록 완료</Eyebrow>
      <H1>{'달고나 라떼를\n메뉴에 추가했어요'}</H1>
      <Card tone="line">
        <KV label="앱 메뉴·레시피" value="등록 완료" tone="ok" />
        <KV label="원가 계산" value="추정 · 단가 필요" tone="amber" />
        <KV label="POS 연결" value="미연결" tone="sub" />
      </Card>
      <Card>
        <H2>이어서 하면 좋아요</H2>
        <ListRow title="달고나 품목 등록·단가 입력" value="등록" to="/inventory/items/new/edit" />
        <ListRow title="POS 메뉴와 연결" value="연결하기" to="/onboarding/recipe" />
      </Card>
      <P tone="mute" small>
        POS에서 판매가 시작돼야 판매 변화를 볼 수 있어요.
      </P>
      <Button to="/menu">메뉴 관리로 이동</Button>
    </Screen>
  )
}
