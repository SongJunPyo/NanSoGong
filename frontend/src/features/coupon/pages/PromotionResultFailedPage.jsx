import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check } from 'lucide-react'
import { Screen } from '@/components/common/layout'
import { Button, Card, Eyebrow, H2, KV, ListRow, Stepper } from '@/components/common/ui'
import { EmptyState } from '@/components/ui/empty-state'
import { AgentSteps } from '@/components/ui/agent-steps'
import { Spinner } from '@/components/ui/loading'

const ID = 'latte-set'
const RETRY_TICK = 900 // 목업에서 단계 하나가 끝나는 시간 (ms)
const RETRY_STEPS = ['POS에 이미 등록됐는지 확인', '프로모션 다시 보내기', '등록 결과 확인']

/** 16-2 POS 반영 실패 (UF-07 8 · UF-20) */
export default function PromotionResultFailedPage() {
  const navigate = useNavigate()
  const [retrying, setRetrying] = useState(false)
  const [step, setStep] = useState(0)

  // 다시 시도 (목업: 단계를 차례로 끝내고 성공 화면으로)
  // TODO API 가 생기면 재시도 요청 → 결과 조회로 바꾼다
  useEffect(() => {
    if (!retrying) return undefined
    const t = setTimeout(() => {
      if (step < RETRY_STEPS.length - 1) setStep((s) => s + 1)
      else navigate(`/promotions/${ID}/result`, { replace: true })
    }, RETRY_TICK)
    return () => clearTimeout(t)
  }, [retrying, step, navigate])

  if (retrying)
    return (
      <Screen title="POS 반영 결과">
        <div className="flex flex-col items-center gap-3 pt-10 pb-4 text-center">
          <Spinner size={40} />
          <h2 className="text-h1 font-bold text-ink">다시 시도하는 중이에요</h2>
          <p className="text-label text-ink-sub">화면을 닫아도 계속 진행돼요.</p>
        </div>
        <Card tone="line">
          <AgentSteps
            label="다시 시도 진행 단계"
            steps={RETRY_STEPS.map((label, i) => ({
              label,
              status: i < step ? 'done' : i === step ? 'active' : 'pending',
            }))}
          />
        </Card>
      </Screen>
    )

  return (
    <Screen title="POS 반영 결과">
      <Eyebrow tone="warn">주말 아침 아메리카노</Eyebrow>
      <Card tone="line" pad="p-2">
        <EmptyState
          kind="error"
          compact
          title="POS 등록에 실패했어요"
          description="POS가 세트 할인 형식을 지원하지 않아요."
        />
        <div className="px-3 pb-3">
          <Stepper steps={['승인', '반영 요청', '반영 실패', '사용 집계']} current={2} failAt={2} />
        </div>
      </Card>

      <Card>
        <H2>이렇게 해결할 수 있어요</H2>
        <div className="flex flex-col">
          <ListRow title="메뉴별 할인으로 바꿔서 다시 승인" value="조건 수정" to={`/promotions/${ID}/edit`} />
          <ListRow title="POS 연동 상태 확인" value="연동 관리" to="/settings/integrations" />
        </div>
      </Card>

      <Card tone="line" gap="gap-2">
        <p className="text-label font-bold text-ink">다시 시도해도 괜찮아요</p>
        {['POS에 아직 등록되지 않아 중복 등록 걱정이 없어요', '승인한 조건 그대로 다시 보내요'].map((t) => (
          <p key={t} className="flex items-start gap-1.5 text-label text-ink-sub">
            <Check size={16} className="mt-0.5 shrink-0 text-success" aria-hidden="true" />
            {t}
          </p>
        ))}
        <KV label="요청 시각" value="11.19 16:03" tone="sub" />
      </Card>

      <Button onClick={() => setRetrying(true)}>다시 시도</Button>
      <Button variant="outline" to="/results">
        나중에 할게요
      </Button>
    </Screen>
  )
}
