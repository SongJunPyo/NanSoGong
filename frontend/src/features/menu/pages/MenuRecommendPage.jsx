import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Screen } from '@/components/common/layout'
import { Button, Card, Chips, Eyebrow, Field, H1, H2, HeadRow, KV, P, Pill } from '@/components/common/ui'
import { won } from '@/lib/format'
import { useImproveRecommendations, useMenuRecommendations, useSetRecommendations } from '@/features/menu/queries'
import MenuTabs from '@/features/menu/components/MenuTabs'
import { toast } from '@/components/ui/toast'
import { Tooltip } from '@/components/ui/tooltip'
import { InlineError } from '@/components/ui/inline-error'

const PRICE_ERROR_ID = 'menu-price-error'

const KINDS = ['신메뉴', '세트 구성', '메뉴 개선']

/** 34 AI 메뉴 추천 — 바로 추가 (UF-16 2~4) */
export default function MenuRecommendPage() {
  const { data: newMenus } = useMenuRecommendations()
  const { data: sets } = useSetRecommendations()
  const { data: improves } = useImproveRecommendations()
  const [kind, setKind] = useState(0)
  const [index, setIndex] = useState(0)

  const list = [newMenus, sets, improves][kind]
  const rec = list[index % list.length]
  const go = (d) => setIndex((i) => (i + d + list.length) % list.length)
  const changeKind = (k) => {
    setKind(k)
    setIndex(0)
  }

  return (
    <Screen title="AI 메뉴 추천">
      <MenuTabs />
      <Eyebrow>트렌드 · 판매 추이 분석</Eyebrow>
      <H1>{['이번 겨울엔\n이 메뉴 어때요?', '같이 팔면\n더 잘 나가요', '이 메뉴는\n손보면 좋아요'][kind]}</H1>
      <Chips items={KINDS} onChange={changeKind} />

      {/* 다시 추천 ‹ 1/3 › */}
      <div className="flex items-center gap-2">
        <span className="text-label font-medium text-ink-sub">다시 추천</span>
        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            aria-label="이전 추천"
            onClick={() => go(-1)}
            className="flex size-10 items-center justify-center rounded-full text-ink hover:bg-surface-muted"
          >
            <ChevronLeft size={20} />
          </button>
          <span className="num w-10 text-center text-label font-bold text-ink" aria-live="polite">
            {(index % list.length) + 1}/{list.length}
          </span>
          <button
            type="button"
            aria-label="다음 추천"
            onClick={() => go(1)}
            className="flex size-10 items-center justify-center rounded-full text-ink hover:bg-surface-muted"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {/* 후보가 바뀌면 입력값도 그 후보 기준으로 새로 시작 */}
      {kind === 0 && <Recommendation key={rec.id} rec={rec} />}
      {kind === 1 && <SetRecommendation key={rec.id} rec={rec} />}
      {kind === 2 && <ImproveRecommendation key={rec.id} rec={rec} />}
    </Screen>
  )
}

/** 세트 구성 추천 */
function SetRecommendation({ rec }) {
  const off = rec.regular - rec.price
  return (
    <>
      <Card>
        <HeadRow title={rec.name}>
          <Pill tone="deep">AI 추천</Pill>
        </HeadRow>
        <div className="flex items-baseline gap-2">
          <span className="text-label text-ink-sub">세트 가격</span>
          <span className="num ml-auto text-h1 font-bold text-woori-deep">{won(rec.price)}원</span>
        </div>
        <KV label="따로 사면" value={`${won(rec.regular)}원 · ${won(off)}원 할인`} />
        <KV label="구성" value={rec.items.join(' + ')} />
        <KV label="예상 효과" value={rec.expected} tone="deep" />
      </Card>
      <Card>
        <H2>추천 이유</H2>
        <P tone="ink">{rec.reason}</P>
        <P tone="mute" small>
          출처: 우리 매장 POS 주문 데이터 · 최근 4주
        </P>
      </Card>
      <Button to="/promotions/latte-set">프로모션으로 만들기</Button>
    </>
  )
}

/** 메뉴 개선 추천 */
function ImproveRecommendation({ rec }) {
  return (
    <>
      <Card tone="amber">
        <HeadRow title={rec.menu}>
          <Pill tone="amberWhite">개선 제안</Pill>
        </HeadRow>
        <P tone="ink">{rec.problem}</P>
      </Card>
      <Card>
        <H2>이렇게 해 보세요</H2>
        <P tone="ink">{rec.suggestion}</P>
        <KV label="기대 효과" value={rec.effect} tone="deep" />
      </Card>
      <Button variant="outline" onClick={() => toast('제안을 메모해 뒀어요', { tone: 'info' })}>
        나중에 볼게요
      </Button>
      <Button to="/menu">메뉴에서 바꾸기</Button>
    </>
  )
}

function Recommendation({ rec }) {
  const navigate = useNavigate()
  const [price, setPrice] = useState(rec.price)

  const priceError =
    price === '' || price <= 0
      ? '판매가를 입력해 주세요'
      : price < rec.cost
        ? `판매가가 예상 원가(${won(rec.cost)}원)보다 낮아요`
        : ''
  const margin = priceError ? null : Math.round(((price - rec.cost) / price) * 100)

  return (
    <>
      <Card>
        {rec.image && (
          <img
            src={rec.image}
            alt={rec.name}
            className="-mx-[18px] -mt-[18px] mb-1 aspect-[16/10] w-[calc(100%+36px)] max-w-none rounded-t-card object-cover"
          />
        )}
        <HeadRow title={rec.name}>
          <Pill tone="deep">AI 추천</Pill>
        </HeadRow>
        <KV
          label={
            <span className="inline-flex items-center gap-0.5">
              검색 관심도
              <Tooltip label="검색 관심도 설명">
                네이버에서 이 메뉴를 얼마나 찾는지 0~100으로 나타낸 값이에요. 기간 안에서 가장 많이 찾은 날이 100이에요.
              </Tooltip>
            </span>
          }
          value={`${rec.interest} · ${rec.trend}`}
        />
        <P tone="mute" small>
          출처: 네이버 데이터랩 · {rec.period}
        </P>
        <KV label="재료" value={rec.ingredients} />
      </Card>

      <Card tone="line">
        <H2>기본 정보</H2>
        <Field label="메뉴명" defaultValue={rec.name} />
        <div className="flex flex-col gap-2">
          <label htmlFor="menu-price" className="text-[13px] font-medium text-ink-sub">
            판매가
          </label>
          <div
            className={`flex h-[52px] items-center rounded-input bg-surface-muted px-4 ${
              priceError ? 'ring-[1.5px] ring-danger' : 'focus-within:ring-2 focus-within:ring-woori-blue'
            }`}
          >
            <input
              id="menu-price"
              inputMode="numeric"
              value={price === '' ? '' : price.toLocaleString('ko-KR')}
              onChange={(e) => {
                const raw = e.target.value.replace(/[^\d]/g, '')
                setPrice(raw === '' ? '' : Number(raw))
              }}
              aria-invalid={!!priceError || undefined}
              aria-describedby={priceError ? PRICE_ERROR_ID : undefined}
              className="num w-full min-w-0 bg-transparent text-body font-medium text-ink outline-none"
            />
            <span className="ml-1.5 text-label text-ink-sub">원</span>
          </div>
          <InlineError id={PRICE_ERROR_ID}>{priceError}</InlineError>
        </div>
        <Field label="카테고리" defaultValue={rec.category} />
      </Card>

      <Card tone="line">
        <H2>AI 표준 레시피 초안</H2>
        {rec.recipe.map((r) =>
          r.linked ? (
            <KV key={r.name} label={r.name} value={r.amount} />
          ) : (
            <div key={r.name} className="flex items-center gap-2">
              <span className="text-label text-ink-sub">{r.name}</span>
              <Pill tone="amber">신규 재료 · 미연결</Pill>
              <span className="num ml-auto text-body font-bold">{r.amount}</span>
            </div>
          ),
        )}
        <div>
          <Button variant="text" to="/inventory/items/new/edit">
            재료 연결·수정
          </Button>
        </div>
      </Card>

      <Card>
        <KV label="예상 원가" value={`${won(rec.cost)}원${rec.estimated ? ' (추정)' : ''}`} tone="amber" />
        <KV
          label={
            <span className="inline-flex items-center gap-0.5">
              예상 마진율
              <Tooltip label="마진율 설명">(판매가 − 원가) ÷ 판매가예요. 원가율은 100%에서 이 값을 뺀 값이에요.</Tooltip>
            </span>
          }
          value={margin == null ? '—' : `${margin}%`}
          tone="deep"
        />
        {rec.estimated && (
          <P tone="mute" small>
            단가가 없는 재료가 있어 추정값이에요.
          </P>
        )}
      </Card>

      {priceError ? (
        <button
          type="button"
          disabled
          className="h-[52px] w-full rounded-button bg-woori-deep text-base font-bold text-white opacity-50"
        >
          메뉴 추가하기
        </button>
      ) : (
        <Button onClick={() => navigate('/menu/recommendations/added', { replace: true })}>메뉴 추가하기</Button>
      )}
    </>
  )
}
