import { useState } from 'react'
import { Screen } from '@/components/common/layout'
import { Button, Card, Divider, Eyebrow, Field, H1, HeadRow, KV, P, Pill } from '@/components/common/ui'

/** 27 입고 확인 — 정상·파손·오배송 구분 (UF-14 1~3) */
export default function ReceivingPage() {
  const [qty, setQty] = useState({ ok: 9, broken: 1, wrong: 0 })
  const ordered = 10
  const missing = Math.max(0, ordered - qty.ok - qty.broken - qty.wrong)
  const num = (k, label, tone) => (
    <label className="flex flex-1 flex-col gap-1.5">
      <span className={`text-xs font-medium ${tone}`}>{label}</span>
      <input
        type="number"
        min={0}
        value={qty[k]}
        onChange={(e) => setQty({ ...qty, [k]: Number(e.target.value) })}
        className="num h-[52px] w-full rounded-input bg-white px-4 text-body font-medium outline-none focus:ring-2 focus:ring-woori-blue"
      />
    </label>
  )
  return (
    <Screen title="입고 확인">
      <Eyebrow>오늘 도착 · 2개 품목</Eyebrow>
      <H1>{'받은 물건을\n상태별로 확인해 주세요'}</H1>
      <Card>
        <HeadRow title="우유 1L" size="text-base">
          <Pill tone="amber">확인 필요</Pill>
        </HeadRow>
        <KV label="주문 / 기존 정상 입고" value={`${ordered} / 0`} />
        <div className="flex gap-2">
          {num('ok', '정상', 'text-ink-sub')}
          {num('broken', '파손', 'text-danger')}
          {num('wrong', '오배송', 'text-ink-sub')}
        </div>
        <Field label="소비기한" defaultValue="2026.11.28" />
        <Divider />
        <KV label="가용 재고 반영" value={`+${qty.ok}개`} tone="deep" />
        <KV label="보류 (파손·오배송)" value={`${qty.broken + qty.wrong}개`} tone="warn" />
        <KV label="미입고" value={`${missing}개`} />
      </Card>
      <Card>
        <HeadRow title="원두 1kg" size="text-base">
          <Pill tone="ok">일치</Pill>
        </HeadRow>
        <KV label="주문 / 정상" value="2 / 2" />
      </Card>
      <Button to="/inventory">정상 수량 입고 확정</Button>
      <Button variant="outline" to="/corrections/new">
        정정 요청 (부족·파손·오배송)
      </Button>
      <P tone="mute" small>
        정상으로 확정한 수량만 재고에 더해요. 파손·오배송은 따로 보류해 둬요.
      </P>
    </Screen>
  )
}
