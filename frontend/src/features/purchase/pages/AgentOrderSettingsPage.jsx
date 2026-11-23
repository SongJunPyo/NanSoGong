import { useNavigate } from 'react-router-dom'
import { Screen } from '@/components/common/layout'
import { Button, Card, Divider, Eyebrow, H1, KV, P, Pill, Toggle } from '@/components/common/ui'
import { won } from '@/lib/format'
import { useAgentOrderSettings } from '@/features/purchase/queries'

/** 24-6 AI 대신 주문 설정 (UF-13 2C) — 쇼핑몰 연결 · 결제 승인 규칙 · 멈춤 조건 */
export default function AgentOrderSettingsPage() {
  const { data: s } = useAgentOrderSettings()
  const navigate = useNavigate()
  return (
    <Screen title="대신 주문 설정">
      <Eyebrow>AI 대신 주문</Eyebrow>
      <H1>{'AI가 쇼핑몰에서\n주문서까지 채워요'}</H1>

      <Card tone="line">
        <p className="text-base font-bold text-ink">쇼핑몰 연결</p>
        {s.malls.map((m, i) => (
          <div key={m.id} className="flex flex-col gap-2.5">
            {i > 0 && <Divider />}
            <div className="flex items-center gap-2">
              <div className="flex flex-col gap-0.5">
                <span className="text-body font-bold text-ink">{m.name}</span>
                <span className="text-[13px] text-ink-sub">{m.sub}</span>
              </div>
              <span className="ml-auto">
                {m.connected ? <Pill tone="ok">연결됨</Pill> : <Pill tone="blue">연결하기</Pill>}
              </span>
            </div>
          </div>
        ))}
        <P small>로그인은 사장님 휴대폰에서만 해요. 비밀번호와 카드 정보는 난소공 서버에 저장하지 않아요.</P>
      </Card>

      <Card>
        <p className="text-base font-bold text-ink">결제 승인 규칙</p>
        <KV label="결제 직전 승인" value={s.alwaysApprove ? '항상' : '한도 밖만'} tone="deep" />
        <Toggle
          label={`자동 승인 (1회 ${won(s.autoApproveLimit)}원 이하)`}
          desc="지정 품목만 승인 알림 없이 결제해요"
          defaultChecked={s.autoApproveOn}
        />
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

      <Button onClick={() => navigate('/orders/agent')}>저장하기</Button>
    </Screen>
  )
}
