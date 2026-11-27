import { useEffect, useId, useRef, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Sparkles } from 'lucide-react'
import { ButtonLoading } from '@/components/ui/loading'
import { toast } from '@/components/ui/toast'
import { emptyMenu, validateMenu } from '@/features/menu/menuLogic'
import { useMenuActions, useMenuWorkspace } from '@/features/menu/queries'
import { menuService } from '@/features/menu/menuService'
import { CategoryCreator, MenuPriceField, MenuSelect, MenuTextField } from './MenuFields'
import RecipeEditor from './RecipeEditor'

/** 목록 팝업·기존 수정 주소·추천 승인 후 상세 편집이 공유하는 메뉴 입력 폼. */
export default function MenuForm({ initial, recommendationId, onSaved, onCancel, onBusyChange, submitLabel }) {
  const { data: workspace } = useMenuWorkspace()
  const [draft, setDraft] = useState(() => ({ ...emptyMenu(), ...structuredClone(initial ?? {}), season: initial?.season ?? { from: 12, to: 4 }, recipeConfirmed: false }))
  const [error, setError] = useState('')
  const [recipeStage, setRecipeStage] = useState('')
  const [recipeSource, setRecipeSource] = useState('')
  const [operationId] = useState(() => crypto.randomUUID())
  const lock = useRef(false)
  const errorRef = useRef(null)
  const formId = useId()
  const action = useMenuActions()
  useEffect(() => { if (error) errorRef.current?.focus() }, [error])
  const set = (key, value) => setDraft((current) => ({ ...current, [key]: value }))
  const category = workspace.categories.find((entry) => entry.id === draft.categoryId)
  const recipeAction = useMutation({
    mutationFn: () => menuService.recommendRecipe(draft, setRecipeStage),
    onSuccess: (response) => {
      setDraft((current) => ({ ...current, recipe: response.recipe, recipeConfirmed: false }))
      setRecipeSource('시연 표준 레시피 초안이에요. 실제 AI API는 호출하지 않았어요.')
    },
  })
  const save = async (event) => {
    event.preventDefault()
    if (lock.current || recipeAction.isPending) return
    const validation = validateMenu(draft, workspace)
    if (validation) { setError(validation); return }
    lock.current = true
    onBusyChange?.(true)
    setError('')
    try {
      const response = await action.mutateAsync({ type: 'SAVE_MENU', payload: { ...draft, recommendationId }, operationId })
      toast(initial?.id ? '메뉴 변경 내용을 저장했어요.' : '메뉴를 추가했어요. 목록에서 NEW 표시를 확인해 주세요.')
      onSaved?.(response.result)
    } catch (err) { setError(err.message) }
    finally { lock.current = false; onBusyChange?.(false) }
  }
  const toggle = (key, value) => set(key, draft[key].includes(value) ? draft[key].filter((entry) => entry !== value) : [...draft[key], value])

  return (
    <form id={formId} onSubmit={save} noValidate className="flex min-w-0 flex-col gap-5 pb-3" aria-busy={action.isPending}>
      {error && <p ref={errorRef} tabIndex={-1} role="alert" className="rounded-input bg-danger-bg p-3 text-label text-danger outline-none focus:ring-2 focus:ring-danger">{error}</p>}
      <div><h3 className="text-body font-bold text-ink">기본 정보</h3><p className="mt-1 text-caption text-ink-sub">* 표시 항목은 필수예요. 입력한 내용은 저장 전까지 반영되지 않아요.</p></div>
      <MenuTextField label="메뉴명 *" aria-label="메뉴명" aria-required="true" value={draft.name} maxLength={100} onChange={(event) => set('name', event.target.value)} placeholder="예: 아이스 아메리카노" />
      <div className="grid grid-cols-2 gap-3">
        <MenuSelect label="카테고리 *" value={draft.categoryId} onChange={(event) => set('categoryId', event.target.value)}>{workspace.categories.map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}</MenuSelect>
        <MenuPriceField label="판매가 *" value={draft.price} onChange={(value) => set('price', value)} aria-label="판매가" aria-required="true" />
      </div>
      <CategoryCreator onAdded={(id) => set('categoryId', id)} />
      {category?.seasonal && <fieldset className="rounded-input bg-woori-tint p-3"><legend className="px-1 text-caption font-bold text-woori-deep">시즌 판매 기간</legend><div className="grid grid-cols-2 gap-3">{[['from', '시작 월'], ['to', '종료 월']].map(([key, label]) => <MenuSelect key={key} label={label} value={draft.season[key]} onChange={(event) => set('season', { ...draft.season, [key]: Number(event.target.value) })}>{Array.from({ length: 12 }, (_, index) => <option key={index} value={index + 1}>{index + 1}월</option>)}</MenuSelect>)}</div><p className="mt-2 text-caption text-ink-sub">12월~4월처럼 해를 넘기는 기간도 설정할 수 있어요. 기간 밖에는 시즌 외로 표시돼요.</p></fieldset>}
      <MenuTextField label={initial?.posCode ? 'POS 코드 · 기존 판매 연결 유지' : 'POS 코드 (선택)'} value={draft.posCode ?? ''} readOnly={Boolean(initial?.posCode)} onChange={(event) => set('posCode', event.target.value)} placeholder="미연결 상태로도 등록할 수 있어요" />
      <fieldset><legend className="mb-2 text-caption font-medium text-ink-sub">사이즈 (선택 · 복수 선택)</legend><div className="flex flex-wrap gap-3">{['Small', 'Regular', 'Large'].map((size) => <label key={size} className="flex min-h-11 items-center gap-2 rounded-lg bg-surface-muted px-3 py-2 text-label text-ink"><input type="checkbox" checked={draft.sizes.includes(size)} onChange={() => toggle('sizes', size)} className="accent-woori-deep" />{size}</label>)}</div></fieldset>
      <fieldset><legend className="mb-2 text-caption font-medium text-ink-sub">HOT / ICE (선택 · 복수 선택)</legend><div className="flex gap-3">{['HOT', 'ICE'].map((temperature) => <label key={temperature} className="flex min-h-11 items-center gap-2 rounded-lg bg-surface-muted px-3 py-2 text-label text-ink"><input type="checkbox" checked={draft.temperatures.includes(temperature)} onChange={() => toggle('temperatures', temperature)} className="accent-woori-deep" />{temperature}</label>)}</div><p className="mt-2 text-caption text-ink-sub">지원 온도 정보예요. 기존 HOT/ICE POS 코드를 하나로 합치지 않아요.</p></fieldset>
      <div className="flex flex-col gap-3 border-t border-line pt-4">
        <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-body font-bold text-ink">레시피</h3><ButtonLoading loading={recipeAction.isPending} loadingText="추천 중..." disabled={action.isPending} full={false} variant="secondary" className="min-h-11 text-label" onClick={() => recipeAction.mutate()}><Sparkles size={15} aria-hidden="true" />AI 레시피 자동 추천</ButtonLoading></div>
        {recipeAction.isPending && <p role="status" className="text-caption text-woori-blue">{recipeStage}</p>}
        {recipeAction.error && <p role="alert" className="text-caption text-danger">{recipeAction.error.message}</p>}
        {recipeSource && <p className="rounded-lg bg-woori-tint p-3 text-caption text-woori-deep">{recipeSource}</p>}
        <RecipeEditor recipe={draft.recipe} onChange={(recipe) => setDraft((current) => ({ ...current, recipe, recipeConfirmed: false }))} />
        {draft.recipe.length > 0 && <label className="flex min-h-11 items-start gap-2 rounded-input border border-line p-3 text-caption text-ink"><input type="checkbox" checked={draft.recipeConfirmed} onChange={(event) => set('recipeConfirmed', event.target.checked)} className="mt-0.5 accent-woori-deep" /><span>재료·사용량·단위를 확인했어요. 이 레시피로 저장합니다.</span></label>}
      </div>
      <p className="text-caption text-ink-sub">판매 상태는 메뉴 관리 목록에서 바꿀 수 있어요. 앱 등록만으로 POS 판매가 시작되지는 않아요.</p>
      <div className="sticky -bottom-3 z-10 -mx-1 grid grid-cols-2 gap-2 border-t border-line bg-white px-1 pt-3 pb-3"><button type="button" disabled={action.isPending} onClick={onCancel} className="h-[52px] rounded-button border border-line text-label font-bold text-ink focus-visible:outline-2 focus-visible:outline-woori-blue">취소</button><ButtonLoading type="submit" loading={action.isPending} loadingText="저장 중..." disabled={recipeAction.isPending}>{submitLabel ?? (initial?.id ? '변경 내용 저장' : '저장')}</ButtonLoading></div>
    </form>
  )
}
