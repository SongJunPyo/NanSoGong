import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Screen } from '@/components/common/layout'
import { Button, Card, Eyebrow, Field, H1, H2, KV, P } from '@/components/common/ui'
import { won } from '@/lib/format'

/** 26-1 직접 주문 등록 (UF-13 2B · 3B) — 쿠팡 등에서 주문하고 돌아와서 실제 내역을 남긴다 */
export default function DirectOrderPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  // 외부 주문 시트에서 넘어오면 주문 조건이 주소에 담겨 온다 (없으면 화면 예시 값)
  const supplier = params.get('supplier') ?? '쿠팡'
  const product = params.get('product') ?? '테이크아웃 컵 16oz'
  const qty = params.get('qty') ?? '500'
  const unit = params.get('unit') ?? '개'
  const price = Number(params.get('price') ?? 51200)
  const arrive = params.get('arrive') ?? '11.22'
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`${product} ${qty}${unit} · 예상 ${won(price)}원`)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  return (
    <Screen title="직접 주문 등록">
      <Eyebrow>{supplier} · 앱 연동 안 됨</Eyebrow>
      <H1>{'주문한 내용을\n등록해 주세요'}</H1>
      <Card>
        <H2>추천했던 주문 조건</H2>
        <KV label="품목 · 수량" value={`${product} × ${qty}`} />
        <KV label="예상 금액" value={`${won(price)}원`} />
        <Button variant="outline" onClick={copy}>
          {copied ? '복사했어요' : '주문 조건 복사'}
        </Button>
      </Card>
      <Field label="주문일" defaultValue="2026.11.19" />
      <div className="grid grid-cols-2 gap-2.5">
        <Field label="실제 수량" defaultValue={qty} />
        <Field label="결제 금액" defaultValue={`${won(price)}원`} />
      </div>
      <Field label="도착 예정일" defaultValue={`2026.${arrive}`} />
      <Field label={`${supplier} 주문번호 (선택)`} placeholder={`${supplier} 주문 상세에서 확인`} />
      <P tone="mute" small>
        결제 금액이 추천보다 다르면 실제 금액으로 고쳐 주세요. 비용 · 원가 계산에 그대로 반영돼요.
      </P>
      <Button onClick={() => navigate('/orders/o1', { replace: true })}>등록하고 입고 관리로</Button>
    </Screen>
  )
}
