import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Screen } from '@/components/common/layout'
import { Card, Divider, Eyebrow, H1, KV, P } from '@/components/common/ui'
import { won } from '@/lib/format'
import { useAgentOrderSettings } from '@/features/purchase/queries'
import { Switch } from '@/components/ui/switch'
import { InlineError } from '@/components/ui/inline-error'
import { Badge } from '@/components/ui/badge'
import { ButtonLoading } from '@/components/ui/loading'
import { toast } from '@/components/ui/toast'

// ⚠️ 가정: 자동 승인 한도 범위는 아직 정해지지 않아 1,000원 ~ 300,000원으로 둔다 (백엔드 준표님과 맞출 것)
const LIMIT_MIN = 1000
const LIMIT_MAX = 300000
const LIMIT_ERROR_ID = 'agent-limit-error'

const limitErrorOf = (v) => {
  if (v === '' || v < LIMIT_MIN) return `${won(LIMIT_MIN)}원 이상 입력해 주세요`
  if (v > LIMIT_MAX) return `${won(LIMIT_MAX)}원까지 정할 수 있어요`
  return ''
}

/** 24-6 AI 대신 주문 설정 (UF-13 2C) — 쇼핑몰 연결 · 결제 승인 규칙 · 멈춤 조건 */
export default function AgentOrderSettingsPage() {
  const { data: s } = useAgentOrderSettings()
  const navigate = useNavigate()
  const [connected, setConnected] = useState(() => Object.fromEntries(s.malls.map((m) => [m.id, m.connected])))
  // 🚨 자동 승인은 기본 '끔' — 서버 값이 없으면 false (사장님이 직접 켠 적이 있을 때만 켜진 채로 보인다)
  const [autoOn, setAutoOn] = useState(s.autoApproveOn === true)
  const [limit, setLimit] = useState(s.autoApproveLimit)
  const [saving, setSaving] = useState(false)

  const limitError = autoOn ? limitErrorOf(limit) : ''

  // 연결 해제는 되돌릴 수 있는 일 → [되돌리기] 토스트
  const disconnect = (m) => {
    setConnected((c) => ({ ...c, [m.id]: false }))
    toast(`${m.name} 연결을 해제했어요`, { undo: () => setConnected((c) => ({ ...c, [m.id]: true })) })
  }
  // 로그인은 사장님 휴대폰에서만 한다 — 여기서는 안내만
  const connect = (m) => toast(`휴대폰 앱에서 ${m.name}에 로그인하면 연결돼요`, { tone: 'info' })

  // TODO API 가 생기면 useMutation 으로 바꾼다 (PUT …/agent-order-settings)
  const save = () => {
    setSaving(true)
    setTimeout(() => {
      toast('대신 주문 설정을 저장했어요')
      navigate('/orders/agent')
    }, 700)
  }

  return (
    <Screen title="대신 주문 설정">
      <Eyebrow>AI 대신 주문</Eyebrow>
      <H1>{'AI가 쇼핑몰에서\n주문서까지 채워요'}</H1>

      <Card tone="line">
        <p className="text-base font-bold text-ink">쇼핑몰 연결</p>
        {s.malls.map((m, i) => {
          const on = connected[m.id]
          return (
            <div key={m.id} className="flex flex-col gap-2.5">
              {i > 0 && <Divider />}
              <div className="flex items-center gap-2">
                <div className="flex min-w-0 flex-col gap-0.5">
                  <span className="flex items-center gap-1.5 text-body font-bold text-ink">
                    {m.name}
                    {on && <Badge>연결됨</Badge>}
                  </span>
                  <span className="text-[13px] text-ink-sub">{m.sub}</span>
                </div>
                {/* 연결 · 연결 해제 버튼은 같은 자리, 같은 크기 */}
                <button
                  type="button"
                  onClick={() => (on ? disconnect(m) : connect(m))}
                  className={`ml-auto h-9 w-[84px] shrink-0 rounded-lg text-label font-bold ${
                    on ? 'border border-line bg-white text-ink-sub' : 'bg-woori-tint text-woori-deep'
                  }`}
                >
                  {on ? '연결 해제' : '연결하기'}
                </button>
              </div>
            </div>
          )
        })}
        <P small>로그인은 사장님 휴대폰에서만 해요. 비밀번호와 카드 정보는 난소공 서버에 저장하지 않아요.</P>
      </Card>

      <Card>
        <p className="text-base font-bold text-ink">결제 승인 규칙</p>
        <KV label="결제 직전 승인" value={s.alwaysApprove ? '항상' : '한도 밖만'} tone="deep" />
        <Switch
          label="자동 승인"
          description="지정 품목이 한도 이하면 승인 알림 없이 결제해요"
          checked={autoOn}
          onCheckedChange={setAutoOn}
        />
        {autoOn && (
          <div className="flex flex-col">
            <label htmlFor="agent-limit" className="mb-2 text-[13px] font-medium text-ink-sub">
              1회 한도
            </label>
            <div
              className={`flex h-[52px] items-center rounded-input bg-white px-4 ${
                limitError ? 'ring-[1.5px] ring-danger' : 'focus-within:ring-2 focus-within:ring-woori-blue'
              }`}
            >
              <input
                id="agent-limit"
                inputMode="numeric"
                value={limit === '' ? '' : limit.toLocaleString('ko-KR')}
                onChange={(e) => {
                  const raw = e.target.value.replace(/[^\d]/g, '')
                  setLimit(raw === '' ? '' : Number(raw))
                }}
                aria-invalid={!!limitError || undefined}
                aria-describedby={limitError ? LIMIT_ERROR_ID : undefined}
                className="num w-full min-w-0 bg-transparent text-right text-body font-bold text-ink outline-none"
              />
              <span className="ml-1.5 text-label text-ink-sub">원 이하</span>
            </div>
            <InlineError id={LIMIT_ERROR_ID}>{limitError}</InlineError>
          </div>
        )}
        <P small>결제 비밀번호는 언제나 사장님이 쇼핑몰 결제 화면에서 직접 입력해요.</P>
      </Card>

      <Card tone="amber">
        <p className="text-base font-bold text-ink">이럴 땐 멈추고 물어봐요</p>
        {s.stopRules.map((r) => (
          <P key={r} tone="ink">
            · {r}
          </P>
        ))}
      </Card>

      <ButtonLoading loading={saving} loadingText="저장하고 있어요" disabled={!!limitError} onClick={save}>
        저장하기
      </ButtonLoading>
    </Screen>
  )
}
