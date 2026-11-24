import { Screen } from '@/components/common/layout'
import { Button, Card, Eyebrow, H1, H2, KV, P } from '@/components/common/ui'

/** 13 AI 운영 제안 전체보기 (UF-06) */
export default function SuggestionsPage() {
  return (
    <Screen title="AI 운영 제안">
      <Eyebrow>오늘의 제안 3개 · 실행 전 승인 필요</Eyebrow>
      <H1>지금 챙기면 좋은 일부터</H1>
      <P>매장 판매·재고·날씨 기록을 바탕으로 제안해요.</P>

      <Card>
        <Eyebrow>01 재고 부족 예상</Eyebrow>
        <H2>우유 12개를 발주할까요?</H2>
        <KV label="현재 추정 재고" value="우유 1L × 4개" />
        <KV label="최근 7일 하루 평균 사용" value="3.4개" />
        <KV label="내일 비 예보 반영" value="사용량 18% ↑" tone="deep" />
        <KV label="예상 소진" value="내일 오전" />
        <Eyebrow>추천 이유</Eyebrow>
        <P tone="ink">
          배송에 하루가 걸려요. 비 오는 날엔 라떼 주문이 늘어서 오늘 발주해야 주말까지 우유를 확보할 수 있어요.
        </P>
        <KV label="추천 발주 예상 비용" value="33,600원" />
        <Button to="/orders/recommendation">수량 확인 후 발주 승인</Button>
      </Card>

      <Card>
        <Eyebrow>02 오후 방문 늘리기</Eyebrow>
        <H2>{'비 오는 오후, 라떼 세트\n프로모션 어때요?'}</H2>
        <P>최근 2주 평일 14–17시 주문이 하루 9건으로, 직전 2주보다 25% 줄었어요.</P>
        <Button variant="outline" to="/promotions/latte-set">
          프로모션 추천 보기
        </Button>
      </Card>

      <Card>
        <Eyebrow>03 메뉴 아이디어</Eyebrow>
        <H2>겨울 시즌 신메뉴 후보가 있어요</H2>
        <P>‘달고나 라떼’ 검색량이 4주 동안 38% 늘었어요.</P>
        <div>
          <Button variant="text" to="/menu/recommendations">
            메뉴 추천 보기 ›
          </Button>
        </div>
      </Card>

      <Card tone="line">
        <H2>분석에 활용한 정보·출처</H2>
        <KV label="POS 판매 내역" value="11.5–11.18" />
        <KV label="기상청 단기예보" value="11.19 05시 발표" />
        <KV label="재고 실사" value="11.15" />
        <KV label="네이버 검색량" value="10.22–11.18" />
        <KV label="최근 수정 이력" value="우유 수량 −2 (11.12)" />
      </Card>
    </Screen>
  )
}
