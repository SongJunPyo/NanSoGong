import { useState } from 'react'
import { Screen } from '@/components/common/layout'
import { Button, Card, Chips, Eyebrow, Field, H1, H2, HeadRow, KV, P, Pill } from '@/components/common/ui'
import { Sheet } from '@/components/ui/sheet'
import { InlineError } from '@/components/ui/inline-error'
import { toast } from '@/components/ui/toast'

const SUPPLIER_ERROR_ID = 'supplier-name-error'

/** 21-1 품목 등록·수정 (UF-09) */
export default function ItemEditPage() {
  const [suppliers, setSuppliers] = useState(['○○유통', '△△마트'])
  const [sheetOpen, setSheetOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [tried, setTried] = useState(false)
  const trimmed = newName.trim()
  const nameError = !tried ? '' : !trimmed ? '공급처 이름을 입력해 주세요' : suppliers.includes(trimmed) ? '이미 있는 공급처예요' : ''

  const addSupplier = () => {
    setTried(true)
    if (!trimmed || suppliers.includes(trimmed)) return
    setSuppliers((list) => [...list, trimmed])
    setSheetOpen(false)
    setNewName('')
    setTried(false)
    toast(`공급처를 추가했어요 · ${trimmed}`)
  }
  const pair = (a, b) => (
    <div className="grid grid-cols-2 gap-2.5">
      {a}
      {b}
    </div>
  )
  return (
    <Screen title="품목 수정">
      <Eyebrow>연동으로 불러온 정보 · 확인 필요 1개</Eyebrow>
      <H1>우유 1L</H1>
      <Field label="품목명" defaultValue="우유 1L" />
      {pair(<Field label="분류" defaultValue="유제품" />, <Field label="관리 단위" defaultValue="개" />)}
      {pair(<Field label="포장 규격" defaultValue="1L × 1개" />, <Field label="단가" defaultValue="2,800원" />)}
      <Card tone="amber">
        <HeadRow title="공급처" size="text-base">
          <Pill tone="amberWhite">확인 필요</Pill>
        </HeadRow>
        <P tone="ink">연동 정보에 공급처가 두 곳이에요. 주로 쓰는 곳을 골라주세요.</P>
        <Chips items={suppliers} />
        <div>
          <Button variant="text" onClick={() => setSheetOpen(true)}>
            + 공급처 추가
          </Button>
        </div>
      </Card>
      <Sheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        title="공급처 추가"
        description="새 거래처 이름을 적어 주세요."
        footer={
          <>
            <Button variant="outline" onClick={() => setSheetOpen(false)}>
              취소
            </Button>
            <Button onClick={addSupplier}>추가</Button>
          </>
        }
      >
        <label htmlFor="supplier-name" className="mb-2 block text-[13px] font-medium text-ink-sub">
          공급처 이름
        </label>
        <input
          id="supplier-name"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addSupplier()}
          placeholder="예: □□식자재"
          aria-invalid={!!nameError || undefined}
          aria-describedby={nameError ? SUPPLIER_ERROR_ID : undefined}
          className={`h-[52px] w-full rounded-input bg-surface-muted px-4 text-body font-medium text-ink outline-none placeholder:font-normal placeholder:text-ink-mute ${
            nameError ? 'ring-[1.5px] ring-danger' : 'focus:ring-2 focus:ring-woori-blue'
          }`}
        />
        <InlineError id={SUPPLIER_ERROR_ID}>{nameError}</InlineError>
      </Sheet>
      <Card tone="line">
        <H2>입고분별 소비기한</H2>
        <KV label="11.14 입고 · 3개" value="~11.22" />
        <KV label="11.17 입고 · 1개" value="~11.25" />
        <div>
          <Button variant="text">+ 입고분 추가</Button>
        </div>
      </Card>
      <Button to="/inventory">저장</Button>
      <div>
        <Button variant="text">품목 삭제</Button>
      </div>
    </Screen>
  )
}
