import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ChevronDown } from 'lucide-react'
import { Screen } from '@/components/common/layout'
import { Button, Card, Chips, Eyebrow, Field, H1, H2, HeadRow, Label, P, Pill } from '@/components/common/ui'
import { Sheet } from '@/components/ui/sheet'
import { InlineError } from '@/components/ui/inline-error'
import { toast } from '@/components/ui/toast'
import { ButtonLoading } from '@/components/ui/loading'
import { won } from '@/lib/format'
import { todayDateKey } from '@/utils/format'
import { useInventory, useSaveInventoryItem } from '@/features/inventory/queries'
import { ITEM_CATEGORIES, ITEM_UNITS } from '@/features/inventory/mock'

const SUPPLIER_ERROR_ID = 'supplier-name-error'
const ITEM_NAME_ERROR_ID = 'item-name-error'
const LOT_ERROR_ID = 'lot-error'
const PACK_LABELS = ['팩', '봉', '병', '박스', '개']

const inputCls =
  'h-[52px] w-full min-w-0 rounded-input bg-surface-muted px-4 text-body font-medium text-ink outline-none placeholder:font-normal placeholder:text-ink-mute focus:ring-2 focus:ring-woori-blue'
// 숫자 칸 입력 정리 — 숫자와 소수점 하나만 남긴다. 소수점을 몰래 지우지 않는다 (0.5 → 5 가 되지 않게)
//   정수만 받는 칸은 화면이 검사해서 오류를 보여 준다 (isWhole)
const cleanNumber = (v) => {
  const [head, ...rest] = String(v).replace(/[^\d.]/g, '').split('.')
  return rest.length ? `${head}.${rest.join('')}` : head
}
const isWhole = (v) => /^\d+$/.test(v)
const isDecimal = (v) => /^\d+(\.\d{1,3})?$/.test(v) // 관리 단위 수량은 소수 셋째 자리까지 (DECIMAL(19,3))
// 보여 줄 때만 정수 부분에 쉼표 (입력 중인 '0.' 도 그대로 보인다)
const showNumber = (v) => {
  if (v === '') return ''
  const [head, tail] = String(v).split('.')
  return `${head === '' ? '' : won(Number(head))}${tail !== undefined ? `.${tail}` : ''}`
}
const PACK_ERROR_ID = 'pack-size-error'
const PRICE_ERROR_ID = 'pack-price-error'
const unitLabelOf = (unit) => ITEM_UNITS.find((u) => u.value === unit)?.label ?? ''
const shortDate = (key) => (key ? `${Number(key.slice(5, 7))}.${key.slice(8, 10)}` : '')

/** 고르는 칸 — 기본 select 에 Field 와 같은 모양을 입힌다 */
function SelectField({ label, value, onChange, options }) {
  return (
    <label className="flex flex-col gap-2">
      <Label>{label}</Label>
      <span className="relative">
        <select value={value} onChange={(e) => onChange(e.target.value)} className={`${inputCls} appearance-none pr-10`}>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown size={18} aria-hidden="true" className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-ink-sub" />
      </span>
    </label>
  )
}

/** 숫자 칸 — 쉼표를 붙여 보여 주고 오른쪽에 단위를 둔다 */
function NumberField({ label, value, onChange, suffix, placeholder, id, invalid, errorId }) {
  return (
    <label className="flex flex-col gap-2">
      {label && <Label>{label}</Label>}
      <span className="relative">
        <input
          id={id}
          inputMode="decimal"
          value={showNumber(value)}
          onChange={(e) => onChange(cleanNumber(e.target.value))}
          placeholder={placeholder}
          aria-invalid={invalid || undefined}
          aria-describedby={invalid && errorId ? errorId : undefined}
          className={`${inputCls} pr-12 ${invalid ? 'ring-[1.5px] ring-danger' : ''}`}
        />
        <span className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-body text-ink-sub">{suffix}</span>
      </span>
    </label>
  )
}

/** 21-1 품목 등록·수정 (UF-09) */
export default function ItemEditPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data: items } = useInventory()
  const item = items.find((i) => i.id === id) // 'new' 처럼 없는 id 면 새 품목 추가
  const save = useSaveInventoryItem()

  const [itemName, setItemName] = useState(item?.name ?? '')
  const [category, setCategory] = useState(item?.category ?? '기타')
  const [unit, setUnit] = useState(item?.unit ?? 'EA')
  const [packLabel, setPackLabel] = useState(item?.packLabel ?? '개')
  const [packSize, setPackSize] = useState(String(item?.packSize ?? 1))
  const [packPrice, setPackPrice] = useState(item?.packPrice != null ? String(item.packPrice) : '')
  const [lots, setLots] = useState(item?.lots ?? [])
  const [triedSave, setTriedSave] = useState(false)
  const itemNameError = triedSave && !itemName.trim() ? '품목명을 입력해 주세요' : ''
  const unitLabel = unitLabelOf(unit)
  const size = isDecimal(packSize) ? Number(packSize) : 0
  // 포장 규격은 0보다 큰 수 — 잘못된 값을 1 같은 기본값으로 바꿔 저장하지 않는다
  const packSizeError = packSize === '' ? '포장 규격을 입력해 주세요' : !isDecimal(packSize) || size <= 0 ? '0보다 큰 수로 입력해 주세요 (소수는 셋째 자리까지)' : ''
  const packPriceError = packPrice !== '' && !isWhole(packPrice) ? '구매 단가는 원 단위 정수로 입력해 주세요' : ''
  // 관리 단위 1당 단가 (item.unit_cost, 소수 넷째 자리까지) — 저장은 서버가 계산한다
  const unitCost = size > 0 && packPrice !== '' ? Math.round((Number(packPrice) / size) * 10000) / 10000 : null

  const saveItem = () => {
    setTriedSave(true)
    if (!itemName.trim() || packSizeError || packPriceError) return
    save.mutate(
      {
        id,
        patch: { name: itemName.trim(), category, unit, packLabel, packSize: size, packPrice: packPrice === '' ? null : Number(packPrice), lots },
      },
      {
        onSuccess: () => {
          toast(item ? '품목 정보를 저장했어요' : '품목을 추가했어요')
          navigate('/inventory')
        },
        onError: (err) => toast(err.message, { tone: 'error' }),
      },
    )
  }

  // 관리 단위를 '개' 로 바꾸면 구매 단위도 1개 = 1개 로 맞춘다
  const changeUnit = (next) => {
    setUnit(next)
    if (next === 'EA' && packLabel === '개') setPackSize('1')
  }

  // ---- 공급처 ----
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

  // ---- 입고분 추가 ----
  const emptyLot = { receivedAt: todayDateKey(), qty: '', amount: '', expiresAt: '' }
  const [lotOpen, setLotOpen] = useState(false)
  const [lotDraft, setLotDraft] = useState(emptyLot)
  const [lotTried, setLotTried] = useState(false)
  // 입고분 수량은 구매 단위(팩 · 봉) 개수라 정수만 — 소수를 넣으면 다른 숫자로 바꾸지 않고 알려 준다
  const lotProblem = (d) =>
    !d.receivedAt
      ? '입고일을 골라 주세요'
      : d.qty === ''
        ? '수량을 입력해 주세요'
        : !isWhole(d.qty) || Number(d.qty) <= 0
          ? `수량은 1 이상의 정수로 입력해 주세요 (${packLabel} 단위)`
          : d.amount === ''
            ? '구매 금액을 입력해 주세요'
            : !isWhole(d.amount)
              ? '구매 금액은 원 단위 정수로 입력해 주세요'
              : d.expiresAt && d.expiresAt < d.receivedAt
                ? '소비기한이 입고일보다 빨라요'
                : ''
  const lotError = lotTried ? lotProblem(lotDraft) : ''
  const suggestedAmount = isWhole(packPrice) && isWhole(lotDraft.qty) && Number(lotDraft.qty) > 0 ? Number(lotDraft.qty) * Number(packPrice) : null

  const openLot = () => {
    setLotDraft(emptyLot)
    setLotTried(false)
    setLotOpen(true)
  }
  const addLot = () => {
    setLotTried(true)
    const d = lotDraft
    if (lotProblem(d)) return
    setLots((list) => [
      ...list,
      { id: `lot-${Date.now()}`, receivedAt: d.receivedAt, qty: Number(d.qty), amount: Number(d.amount), expiresAt: d.expiresAt || null },
    ])
    setLotOpen(false)
    toast(`${shortDate(d.receivedAt)} 입고분을 추가했어요`)
  }

  const pair = (a, b) => (
    <div className="grid grid-cols-2 gap-2.5">
      {a}
      {b}
    </div>
  )

  return (
    <Screen title={item ? '품목 수정' : '품목 추가'}>
      {/* 연동으로 불러온 품목을 고칠 때만 — 새 품목에는 연동 정보가 없다 */}
      {item && <Eyebrow>연동으로 불러온 정보 · 확인 필요 1개</Eyebrow>}
      {/* 제목은 입력 중인 품목명을 그대로 따라간다 */}
      <H1>{itemName.trim() || '새 품목'}</H1>


      <div className="flex flex-col">
        <Field
          label="품목명"
          value={itemName}
          onChange={(e) => setItemName(e.target.value)}
          placeholder="예: 우유 1L"
          highlight={!!itemNameError}
        />
        <InlineError id={ITEM_NAME_ERROR_ID}>{itemNameError}</InlineError>
      </div>
      {pair(
        <SelectField label="분류" value={category} onChange={setCategory} options={ITEM_CATEGORIES.map((c) => ({ value: c, label: c }))} />,
        <SelectField label="관리 단위" value={unit} onChange={changeUnit} options={ITEM_UNITS} />,
      )}

      {/* 포장 규격 — 주문은 구매 단위(팩 · 봉)로, 재고 · 레시피는 관리 단위(ml · g)로 세서 둘을 잇는다 */}
      <div className="flex flex-col gap-2">
        <Label>포장 규격 · 구매 1개에 든 양</Label>
        <div className="flex items-center gap-2">
          <span className="text-body font-bold text-ink">1</span>
          <span className="relative w-24 shrink-0">
            <select
              aria-label="구매 단위"
              value={packLabel}
              onChange={(e) => setPackLabel(e.target.value)}
              className={`${inputCls} appearance-none pr-8`}
            >
              {PACK_LABELS.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
            <ChevronDown size={16} aria-hidden="true" className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-ink-sub" />
          </span>
          <span className="text-body font-bold text-ink">=</span>
          <div className="min-w-0 flex-1">
            <NumberField
              value={packSize}
              onChange={setPackSize}
              suffix={unitLabel}
              placeholder="1000"
              invalid={triedSave && !!packSizeError}
              errorId={PACK_ERROR_ID}
            />
          </div>
        </div>
        <InlineError id={PACK_ERROR_ID}>{triedSave ? packSizeError : ''}</InlineError>
      </div>

      <div className="flex flex-col gap-1.5">
        <NumberField
          label={`구매 단가 · 1${packLabel}`}
          value={packPrice}
          onChange={setPackPrice}
          suffix="원"
          placeholder="예: 2800"
          invalid={!!packPriceError}
          errorId={PRICE_ERROR_ID}
        />
        <InlineError id={PRICE_ERROR_ID}>{packPriceError}</InlineError>
        {unitCost != null && (
          <p className="text-caption text-ink-sub">
            {unitLabel === '개' ? '1개' : `1${unitLabel}`}당 {unitCost.toLocaleString('ko-KR', { maximumFractionDigits: 4 })}원으로 원가를 계산해요
          </p>
        )}
      </div>

      {/* 새 품목은 연동 정보가 없으니 '확인 필요' 안내 없이 고르기만 */}
      <Card tone={item ? 'amber' : 'tint'}>
        <HeadRow title="공급처" size="text-base">
          {item && <Pill tone="amberWhite">확인 필요</Pill>}
        </HeadRow>
        {item ? (
          <P tone="ink">연동 정보에 공급처가 두 곳이에요. 주로 쓰는 곳을 골라주세요.</P>
        ) : (
          <P>주로 사는 곳을 골라 주세요. 목록에 없으면 추가할 수 있어요.</P>
        )}
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

      {/* 입고분별 소비기한 · 구매 금액 */}
      <Card tone="line" gap="gap-0">
        <H2>입고분별 소비기한</H2>
        {lots.length === 0 ? (
          <p className="py-3 text-label text-ink-sub">아직 입고분이 없어요.</p>
        ) : (
          <ul className="mt-2 flex flex-col divide-y divide-line">
            {lots.map((lot) => (
              <li key={lot.id} className="flex items-center gap-3 py-3">
                <div className="flex min-w-0 flex-col gap-0.5">
                  <span className="text-label font-bold text-ink">
                    {shortDate(lot.receivedAt)} 입고 · {won(lot.qty)}
                    {packLabel}
                  </span>
                  <span className="num text-caption text-ink-sub">
                    {won(lot.amount)}원{lot.qty > 0 && ` · 1${packLabel} ${won(Math.round(lot.amount / lot.qty))}원`}
                  </span>
                </div>
                <span className="num ml-auto shrink-0 text-label font-bold text-ink">
                  {lot.expiresAt ? `~${shortDate(lot.expiresAt)}` : '기한 없음'}
                </span>
              </li>
            ))}
          </ul>
        )}
        <div className="pt-1">
          <Button variant="text" onClick={openLot}>
            + 입고분 추가
          </Button>
        </div>
      </Card>
      <Sheet
        open={lotOpen}
        onOpenChange={setLotOpen}
        title="입고분 추가"
        description="받은 날, 수량, 산 금액을 적어 주세요."
        footer={
          <>
            <Button variant="outline" onClick={() => setLotOpen(false)}>
              취소
            </Button>
            <Button onClick={addLot}>추가</Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-2.5">
            <label className="flex flex-col gap-2">
              <Label>입고일</Label>
              <input type="date" value={lotDraft.receivedAt} onChange={(e) => setLotDraft({ ...lotDraft, receivedAt: e.target.value })} className={inputCls} />
            </label>
            <label className="flex flex-col gap-2">
              <Label>소비기한 (없으면 비워 두세요)</Label>
              <input type="date" value={lotDraft.expiresAt} onChange={(e) => setLotDraft({ ...lotDraft, expiresAt: e.target.value })} className={inputCls} />
            </label>
          </div>
          <NumberField label="수량" value={lotDraft.qty} onChange={(v) => setLotDraft({ ...lotDraft, qty: v })} suffix={packLabel} placeholder="3" />
          <div className="flex flex-col gap-1.5">
            <NumberField
              label="구매 금액"
              value={lotDraft.amount}
              onChange={(v) => setLotDraft({ ...lotDraft, amount: v })}
              suffix="원"
              placeholder={suggestedAmount != null ? won(suggestedAmount) : '8400'}
            />
            {suggestedAmount != null && lotDraft.amount === '' && (
              <button
                type="button"
                onClick={() => setLotDraft({ ...lotDraft, amount: String(suggestedAmount) })}
                className="self-start rounded-md px-1 text-caption font-bold text-woori-blue hover:bg-woori-tint"
              >
                구매 단가로 채우기 · {won(suggestedAmount)}원
              </button>
            )}
          </div>
          <InlineError id={LOT_ERROR_ID}>{lotError}</InlineError>
        </div>
      </Sheet>

      <ButtonLoading loading={save.isPending} loadingText="저장하고 있어요" onClick={saveItem}>
        저장
      </ButtonLoading>
    </Screen>
  )
}
