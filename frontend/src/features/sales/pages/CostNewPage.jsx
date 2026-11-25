import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Screen } from '@/components/common/layout'
import { InlineError } from '@/components/ui/inline-error'
import { Button, ButtonRow, Card, Chips, HeadRow, KV2, Label, P, Pill } from '@/components/common/ui'

function FieldRow({ label, value }) {
  return (
    <label className="flex flex-col gap-2">
      <Label>{label}</Label>
      <input
        defaultValue={value}
        className="h-[52px] w-full min-w-0 rounded-input bg-surface-muted px-4 text-body font-medium outline-none focus:ring-2 focus:ring-woori-blue"
      />
    </label>
  )
}

const CATEGORIES = ['임대료', '인건비', '수수료', '공과금', '포장재', '기타']
const OTHER = CATEGORIES.length - 1
const NAME_MAX = 30 // ⚠️ 가정: 비용 이름 최대 길이 (expense 표 칸 길이와 맞출 것)

/** 43-1 비용 추가 (UF-18 2) — '기타'를 고르면 비용 이름을 직접 적는다 */
export default function CostNewPage() {
  const navigate = useNavigate()
  const [category, setCategory] = useState(3)
  const [name, setName] = useState('')
  const [nameError, setNameError] = useState('')
  const nameRef = useRef(null)
  const isOther = category === OTHER

  // TODO API 가 생기면 useMutation 으로 저장한다
  const save = () => {
    if (isOther && !name.trim()) {
      setNameError('어떤 비용인지 이름을 적어 주세요')
      nameRef.current?.focus()
      return
    }
    navigate('/sales/costs')
  }

  return (
    <Screen title="비용 추가">
      <Label>항목</Label>
      <Chips items={CATEGORIES} defaultIndex={category} onChange={setCategory} />
      {isOther && (
        <label className="flex flex-col gap-2">
          <Label>비용 이름</Label>
          <input
            ref={nameRef}
            value={name}
            maxLength={NAME_MAX}
            placeholder="예: 세스코, 정수기 렌탈"
            aria-invalid={!!nameError}
            aria-describedby="cost-name-error"
            onChange={(e) => {
              setName(e.target.value)
              if (nameError) setNameError('')
            }}
            className="h-[52px] w-full min-w-0 rounded-input bg-surface-muted px-4 text-body font-medium outline-none focus:ring-2 focus:ring-woori-blue aria-invalid:ring-2 aria-invalid:ring-danger"
          />
          <InlineError id="cost-name-error">{nameError}</InlineError>
        </label>
      )}
      <FieldRow label="금액" value="240,000원" />
      <div className="grid grid-cols-2 gap-2.5">
        <FieldRow label="적용 시작" value="2026.11.01" />
        <FieldRow label="적용 끝" value="2026.11.30" />
      </div>
      <Label>반복</Label>
      <Chips items={['매월', '한 번만']} />
      <Card tone="amber">
        <HeadRow title="비슷한 거래가 있어요" size="text-base">
          <Pill tone="amberWhite">중복 후보</Pill>
        </HeadRow>
        <KV2 title="11.10 출금 · 관리비" sub="금융 연동" value="120,000원" />
        <P tone="ink">같은 비용이면 연결해서 한 번만 계산해요.</P>
        <ButtonRow>
          <Button variant="outline">같은 비용이에요</Button>
          <Button variant="outline">다른 비용이에요</Button>
        </ButtonRow>
      </Card>
      <Button onClick={save}>저장</Button>
    </Screen>
  )
}
