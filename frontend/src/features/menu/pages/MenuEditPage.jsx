import { Screen } from '@/components/common/layout'
import {
  Button,
  Card,
  Chips,
  Divider,
  Eyebrow,
  Field,
  H2,
  Hero,
  HeroLabel,
  HeroValue,
  KV,
  Label,
  P,
  Toggle,
} from '@/components/common/ui'

/** 32 메뉴·레시피 편집 (UF-15 1~6) */
export default function MenuEditPage() {
  return (
    <Screen title="메뉴 편집">
      <Field label="메뉴명" defaultValue="카페라떼" />
      <Field label="카테고리" defaultValue="커피" />
      <Field label="판매가" defaultValue="5,000원" />
      <Label>규격</Label>
      <Chips items={['Tall 355ml', 'Grande 473ml']} />
      <Card tone="line" pad="px-4 py-1">
        <Toggle label="판매 중" desc="끄면 앱에서 판매 중지 메뉴로 표시돼요" />
      </Card>
      <Card>
        <H2>레시피</H2>
        <KV label="원두" value="18 g" />
        <KV label="우유" value="200 ml" />
        <KV label="컵 · 뚜껑" value="1 개" />
        <Divider />
        <Eyebrow>옵션별 추가 재료</Eyebrow>
        <KV label="샷 추가" value="+ 원두 18 g" />
        <KV label="Grande" value="+ 우유 80 ml" />
        <KV label="오트 변경" value="우유 → 오트 200 ml" />
        <div>
          <Button variant="text">+ 재료 추가</Button>
        </div>
      </Card>
      <Hero>
        <HeroLabel>메뉴 원가</HeroLabel>
        <HeroValue size="text-[28px]">1,200원</HeroValue>
        <div className="flex text-label">
          <span className="text-[#d9ebfa]">원가율 24%</span>
          <span className="ml-auto font-bold text-white">예상 매출총이익 3,800원</span>
        </div>
      </Hero>
      <Card tone="line">
        <KV label="앱 등록" value="등록됨" tone="ok" />
        <KV label="POS 연결" value="연결됨" tone="ok" />
        <P tone="mute" small>
          레시피·단가를 바꾸면 저장한 날부터 계산에 반영돼요.
        </P>
      </Card>
      <Button to="/menu">저장</Button>
    </Screen>
  )
}
