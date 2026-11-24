import { useState } from 'react'
import { Screen } from '@/components/common/layout'
import { Button, Card, H2, P } from '@/components/common/ui'
import { useIsDesktop } from '@/hooks/useViewport'
import { toast } from '@/components/ui/toast'
import { Banner } from '@/components/ui/banner'
import { Modal } from '@/components/ui/modal'
import { Sheet, SheetRadioList } from '@/components/ui/sheet'
import { InlineError } from '@/components/ui/inline-error'
import { Tooltip } from '@/components/ui/tooltip'
import { CoachMark, resetCoachMark } from '@/components/ui/coach-mark'
import { Badge, CountBadge } from '@/components/ui/badge'
import { ButtonLoading, Skeleton, SkeletonCard, Spinner } from '@/components/ui/loading'
import { QuantityInput } from '@/components/ui/quantity-input'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { Switch } from '@/components/ui/switch'
import { EmptyState } from '@/components/ui/empty-state'
import { AgentSteps, DoneCheck } from '@/components/ui/agent-steps'

// /dev/ui — 공통 피드백 컴포넌트 확인용 (개발용, 화면 목록에는 넣지 않는다)
// 브라우저 폭을 1280px · 375px 로 바꿔 가며 웹 · 앱 모습을 비교한다

const REJECT_REASONS = ['수량이 너무 많아요', '가격이 비싸요', '이번 주는 필요 없어요', '다른 곳에서 살게요']
const EMPTY_KINDS = [
  ['first', '첫 사용'],
  ['no-results', '검색 결과 없음'],
  ['no-filter', '필터 결과 없음'],
  ['offline', '오프라인'],
  ['done', '모두 완료'],
  ['error', '오류'],
  ['locked', '잠김'],
]
const COACH_KEY = 'ui-showcase'

function Section({ title, coach, children }) {
  return (
    <Card tone="line" gap="gap-3">
      <H2>
        <span data-coach={coach}>{title}</span>
      </H2>
      {children}
    </Card>
  )
}

export default function UiShowcasePage() {
  const desktop = useIsDesktop()
  const [modal, setModal] = useState(false)
  const [paying, setPaying] = useState(false)
  const [sheet, setSheet] = useState(false)
  const [reason, setReason] = useState(null)
  const [qty, setQty] = useState(10)
  const [sort, setSort] = useState('total')
  const [auto, setAuto] = useState(false)
  const [sending, setSending] = useState(false)
  const [kind, setKind] = useState('first')
  const [stepAt, setStepAt] = useState(1)
  const [coachOn, setCoachOn] = useState(false)
  const [doneKey, setDoneKey] = useState(0)

  const qtyError = qty === '' || qty < 1 ? '1개 이상 입력해 주세요' : ''
  const agentSteps = ['쿠팡 열기', '상품 담기', '주문서 채우기', '결제 요청'].map((label, i) => ({
    label,
    status: i < stepAt ? 'done' : i === stepAt ? 'active' : 'pending',
  }))

  const send = () => {
    setSending(true)
    setTimeout(() => {
      setSending(false)
      toast('3개 품목 발주를 보냈어요')
    }, 1200)
  }
  const pay = () => {
    setPaying(true)
    setTimeout(() => {
      setPaying(false)
      setModal(false)
      toast('결제 요청을 보냈어요')
    }, 1200)
  }

  return (
    <Screen title="공통 UI 확인" wide>
      <P>
        지금 모습: <b className="text-woori-deep">{desktop ? '웹 (1024px 이상)' : '앱 (1024px 미만)'}</b> · 브라우저 폭을 바꿔 보세요.
      </P>

      <div className="grid gap-4 lg:grid-cols-2">
        <Section title="Toast" coach="toast">
          <P small>웹은 오른쪽 위, 앱은 화면 아래 스낵바로 떠요.</P>
          <div className="flex flex-wrap gap-2">
            <Button full={false} variant="secondary" onClick={() => toast('발주를 보냈어요')}>
              끝난 일
            </Button>
            <Button full={false} variant="secondary" onClick={() => toast('우유를 뺐어요', { undo: () => toast('우유를 다시 넣었어요') })}>
              되돌리기 있음
            </Button>
            <Button full={false} variant="outline" onClick={() => toast('저장하지 못했어요', { tone: 'error' })}>
              오류
            </Button>
          </div>
        </Section>

        <Section title="Banner">
          <Banner tone="warn" title="다음 주 우유가 부족할 것 같아요" action={<a href="#inventory">재고 보기 ›</a>}>
            지금 재고로 3일 버틸 수 있어요.
          </Banner>
          <Banner tone="danger" title="발주 자금이 부족해요" dismissKey="showcase-fund" dismissFor="week">
            닫으면 이번 주에는 다시 안 보여요.
          </Banner>
        </Section>

        <Section title="Modal (돈 · 동의 전용)">
          <Button onClick={() => setModal(true)}>결제 승인 열기</Button>
          <Modal
            open={modal}
            onOpenChange={setModal}
            title="이대로 결제할까요?"
            description="사장님이 확정해야 결제돼요."
            confirmLabel="결제하기"
            onConfirm={pay}
            confirmLoading={paying}
          >
            <div className="flex flex-col gap-1 rounded-input bg-surface-muted p-4">
              <span className="text-label text-ink-sub">배송비 포함 총액</span>
              <span className="num text-display font-bold text-ink">19,800원</span>
              <span className="text-caption text-ink-sub">상품 16,800원 + 배송비 3,000원</span>
            </div>
          </Modal>
        </Section>

        <Section title="Sheet">
          <P small>앱은 바텀시트(스프링), 웹은 가운데 창이에요.</P>
          <Button variant="secondary" onClick={() => setSheet(true)}>
            반려 사유 고르기
          </Button>
          <Sheet
            open={sheet}
            onOpenChange={setSheet}
            title="반려 사유를 골라 주세요"
            description="다음 추천에 반영할게요."
            footer={
              <>
                <Button variant="outline" onClick={() => setSheet(false)}>
                  취소
                </Button>
                <ButtonLoading
                  disabled={!reason}
                  onClick={() => {
                    setSheet(false)
                    toast('반려했어요')
                  }}
                >
                  반려하기
                </ButtonLoading>
              </>
            }
          >
            <SheetRadioList name="reason" options={REJECT_REASONS} value={reason} onChange={setReason} />
          </Sheet>
        </Section>

        <Section title="QuantityInput + InlineError">
          <P small>웹은 숫자 입력 칸, 앱은 ± 스테퍼예요. 0을 넣어 보세요.</P>
          <div>
            <QuantityInput id="demo-qty" label="우유 수량" unit="개" value={qty} onChange={setQty} invalid={!!qtyError} errorId="demo-qty-error" />
            <InlineError id="demo-qty-error">{qtyError}</InlineError>
          </div>
        </Section>

        <Section title="Tooltip">
          <div className="flex items-center gap-1 text-body text-ink">
            개당가 1,280원
            <Tooltip label="개당가 설명">배송비를 포함한 총액을 개수로 나눈 값이에요.</Tooltip>
          </div>
          <div className="flex items-center gap-1 text-body text-ink">
            검색 관심도 82
            <Tooltip label="검색 관심도 설명">
              최근 4주 네이버 검색량을 0~100으로 바꾼 값이에요. 출처: 네이버 데이터랩
            </Tooltip>
          </div>
        </Section>

        <Section title="Badge">
          <div className="flex flex-wrap gap-1.5">
            {['승인 대기', '배송 중', '완료', '최저가', '멈춤', '보류'].map((t) => (
              <Badge key={t}>{t}</Badge>
            ))}
          </div>
          <div className="flex items-center gap-2 text-label text-ink-sub">
            개수 <CountBadge count={3} /> <CountBadge count={120} /> <CountBadge count={5} tone="muted" />
          </div>
        </Section>

        <Section title="Skeleton · Spinner · ButtonLoading">
          <Skeleton className="h-5 w-1/2" />
          <SkeletonCard lines={2} />
          <Spinner showLabel label="가격을 비교하고 있어요" />
          <ButtonLoading loading={sending} loadingText="발주를 보내고 있어요" onClick={send}>
            승인하고 발주하기
          </ButtonLoading>
        </Section>

        <Section title="SegmentedControl · Switch">
          <SegmentedControl
            label="정렬"
            value={sort}
            onChange={setSort}
            items={[
              { value: 'total', label: '총액순' },
              { value: 'unit', label: '개당가순' },
              { value: 'fast', label: '빠른 배송순' },
            ]}
          />
          <Switch label="자동 승인" description="기본값은 꺼져 있어요." checked={auto} onCheckedChange={setAuto} />
        </Section>

        <Section title="AgentSteps">
          <AgentSteps key={stepAt} steps={agentSteps} />
          <div className="flex gap-2">
            <Button full={false} variant="outline" onClick={() => setStepAt((s) => Math.max(0, s - 1))}>
              이전
            </Button>
            <Button full={false} variant="secondary" onClick={() => setStepAt((s) => Math.min(4, s + 1))}>
              다음 단계
            </Button>
          </div>
          <div className="flex items-center gap-3">
            <DoneCheck key={doneKey} size={56} />
            <Button full={false} variant="text" onClick={() => setDoneKey((k) => k + 1)}>
              ✓ 바운스 다시 보기
            </Button>
          </div>
        </Section>

        <Section title="CoachMark" coach="coach">
          <Button
            variant="secondary"
            onClick={() => {
              resetCoachMark(COACH_KEY)
              setCoachOn(false)
              setTimeout(() => setCoachOn(true))
            }}
          >
            안내 다시 보기
          </Button>
          {coachOn && (
            <CoachMark
              storageKey={COACH_KEY}
              onFinish={() => setCoachOn(false)}
              steps={[
                { target: 'toast', title: '알림', body: '끝난 일은 여기처럼 짧게 알려 드려요.' },
                { target: 'empty', title: '빈 화면', body: '할 일이 없으면 다음에 할 일을 보여 드려요.' },
                { target: 'coach', title: '다시 보기', body: '안내는 언제든 다시 볼 수 있어요.' },
              ]}
            />
          )}
        </Section>
      </div>

      <Section title="EmptyState" coach="empty">
        <SegmentedControl size="sm" label="종류" value={kind} onChange={setKind} items={EMPTY_KINDS.map(([value, label]) => ({ value, label }))} />
        {kind === 'locked' ? (
          <EmptyState
            kind="locked"
            title="최소 주문 금액을 못 채웠어요"
            description="4,250원어치를 더 담으면 주문할 수 있어요."
            progress={{ value: 15550, max: 19800, unit: '원', label: '최소 주문 금액까지' }}
          />
        ) : kind === 'error' ? (
          <EmptyState kind="error" action={<Button onClick={() => toast('다시 불러왔어요')}>다시 시도</Button>} />
        ) : kind === 'no-results' ? (
          <EmptyState
            kind="no-results"
            title="쇼핑몰에서 찾지 못했어요"
            description="등록 거래처로 주문할까요?"
            action={<Button>거래처로 주문하기</Button>}
          />
        ) : kind === 'done' ? (
          <EmptyState kind="done" title="오늘 할 일을 다 끝냈어요" />
        ) : (
          <EmptyState kind={kind} />
        )}
      </Section>
    </Screen>
  )
}
