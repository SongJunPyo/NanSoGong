import { useParams } from 'react-router-dom'
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
import { won } from '@/lib/format'
import { useMenus } from '@/features/menu/queries'

/** 32 메뉴·레시피 편집 (UF-15 1~6) */
export default function MenuEditPage() {
  const { id } = useParams()
  const { data: menus } = useMenus()
  const m = menus.find((item) => item.id === id) // 'new' 처럼 없는 id 면 빈 칸으로 새 메뉴 추가
  const isDrink = !m || m.category === '커피' // 디저트는 규격 · 음료 옵션이 없다
  const costRate = m ? Math.round((m.cost / m.price) * 100) : null
  return (
    <Screen title={m ? '메뉴 편집' : '메뉴 추가'}>
      <Field label="메뉴명" defaultValue={m?.name ?? ''} placeholder="예: 바닐라 라떼" />
      <Field label="카테고리" defaultValue={m?.category ?? ''} placeholder="예: 커피" />
      <Field label="판매가" defaultValue={m ? `${won(m.price)}원` : ''} placeholder="예: 5,000원" />
      {isDrink && (
        <>
          <Label>규격</Label>
          <Chips items={['Tall 355ml', 'Grande 473ml']} />
        </>
      )}
      <Card tone="line" pad="px-4 py-1">
        <Toggle label="판매 중" desc="끄면 앱에서 판매 중지 메뉴로 표시돼요" />
      </Card>
      <Card>
        <H2>레시피</H2>
        {m ? (
          m.recipe.map((r) => <KV key={r.name} label={r.name} value={r.amount} />)
        ) : (
          <P tone="mute" small>
            아직 재료가 없어요. 아래에서 재료를 추가해 주세요.
          </P>
        )}
        {isDrink && (
          <>
            <Divider />
            <Eyebrow>옵션별 추가 재료</Eyebrow>
            <KV label="샷 추가" value="+ 원두 18 g" />
            <KV label="Grande" value="+ 우유 80 ml" />
            <KV label="오트 변경" value="우유 → 오트 200 ml" />
          </>
        )}
        <div>
          <Button variant="text">+ 재료 추가</Button>
        </div>
      </Card>
      <Hero>
        <HeroLabel>메뉴 원가</HeroLabel>
        <HeroValue size="text-[28px]">{m ? `${won(m.cost)}원` : '—'}</HeroValue>
        <div className="flex text-label">
          <span className="text-[#d9ebfa]">원가율 {costRate == null ? '—' : `${costRate}%`}</span>
          <span className="ml-auto font-bold text-white">예상 매출총이익 {m ? `${won(m.price - m.cost)}원` : '—'}</span>
        </div>
      </Hero>
      <Card tone="line">
        <KV label="앱 등록" value="등록됨" tone="ok" />
        <KV label="POS 연결" value={m?.pos ? '연결됨' : '연결 필요'} tone={m?.pos ? 'ok' : 'amber'} />
        <P tone="mute" small>
          레시피·단가를 바꾸면 저장한 날부터 계산에 반영돼요.
        </P>
      </Card>
      <Button to="/menu">저장</Button>
    </Screen>
  )
}
