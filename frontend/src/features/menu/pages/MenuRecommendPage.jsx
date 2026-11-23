import { useNavigate } from 'react-router-dom'
import { Screen } from '@/components/common/layout'
import { Button, Card, Chips, Eyebrow, Field, H1, H2, HeadRow, KV, P, Pill } from '@/components/common/ui'

/** 34 AI 메뉴 추천 — 바로 추가 (UF-16 2~4) */
export default function MenuRecommendPage() {
  const navigate = useNavigate()
  return (
    <Screen title="AI 메뉴 추천">
      <Eyebrow>트렌드 · 판매 추이 분석</Eyebrow>
      <H1>{'이번 겨울엔\n이 메뉴 어때요?'}</H1>
      <Chips items={['신메뉴', '세트 구성', '메뉴 개선']} />
      <Card>
        <HeadRow title="달고나 라떼">
          <Pill tone="deep">AI 추천</Pill>
        </HeadRow>
        <KV label="트렌드 근거" value="검색량 38% ↑" />
        <P tone="mute" small>
          출처: 네이버 데이터랩 · 10.22–11.18
        </P>
        <KV label="재료" value="기존 2개 + 신규 1개" />
      </Card>
      <Card tone="line">
        <H2>기본 정보</H2>
        <Field label="메뉴명" defaultValue="달고나 라떼" />
        <Field label="판매가" defaultValue="6,000원" />
        <Field label="카테고리" defaultValue="커피" />
      </Card>
      <Card tone="line">
        <H2>AI 표준 레시피 초안</H2>
        <KV label="원두" value="18 g" />
        <KV label="우유" value="200 ml" />
        <div className="flex items-center gap-2">
          <span className="text-label text-ink-sub">달고나</span>
          <Pill tone="amber">신규 재료 · 미연결</Pill>
          <span className="num ml-auto text-body font-bold">15 g</span>
        </div>
        <div>
          <Button variant="text" to="/inventory/items/new/edit">
            재료 연결·수정
          </Button>
        </div>
      </Card>
      <Card>
        <KV label="예상 원가" value="1,650원 (추정)" tone="amber" />
        <KV label="예상 마진율" value="72%" tone="deep" />
        <P tone="mute" small>
          달고나 단가가 없어 추정값이에요.
        </P>
      </Card>
      <Button onClick={() => navigate('/menu/recommendations/added', { replace: true })}>메뉴 추가하기</Button>
    </Screen>
  )
}
