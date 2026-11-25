import { DropdownMenu } from 'radix-ui'
import { Check, ChevronDown } from 'lucide-react'
import { useMyStores } from '@/hooks/useAuthSession'
import { useStoreSelection } from '@/store/useStoreSelection'
import { useStoreInfo } from '@/features/store/queries'
import { toast } from '@/components/ui/toast'

// 받침에 맞는 '(으)로' — 받침 없거나 ㄹ 받침이면 '로'
const withRo = (word) => {
  const code = word.charCodeAt(word.length - 1) - 0xac00
  const jong = code >= 0 && code <= 11171 ? code % 28 : 0
  return `${word}${jong === 0 || jong === 8 ? '로' : '으로'}`
}

/** 홈 제목 위 매장 이름 — 누르면 내 매장 중에서 고른다 (매장마다 화면 데이터가 따로 보인다) */
export default function StoreSwitcher() {
  const { data: stores = [] } = useMyStores()
  const { data: info } = useStoreInfo()
  const storeId = useStoreSelection((s) => s.storeId)
  const selectStore = useStoreSelection((s) => s.selectStore)
  const current = stores.find((s) => s.storeId === storeId)
  const name = current?.name ?? info.name

  const choose = (store) => {
    if (store.storeId === storeId) return
    selectStore(store.storeId)
    toast(`${withRo(store.name)} 바꿨어요`)
  }

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        aria-label={`매장 바꾸기, 지금 ${name}`}
        className="-ml-1 flex max-w-full items-center gap-0.5 rounded-md px-1 text-label font-bold text-woori-blue hover:bg-woori-tint focus-visible:outline-2 focus-visible:outline-woori-blue"
      >
        <span className="truncate">{name}</span>
        <ChevronDown size={16} aria-hidden="true" className="shrink-0" />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="start"
          sideOffset={6}
          className="animate-fade-in z-50 min-w-[220px] rounded-input border border-line bg-white p-1 shadow-lg"
        >
          <DropdownMenu.Label className="px-3 pt-2 pb-1 text-caption text-ink-sub">내 매장</DropdownMenu.Label>
          {stores.map((store) => (
            <DropdownMenu.Item
              key={store.storeId}
              onSelect={() => choose(store)}
              className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2.5 text-label text-ink outline-none data-[highlighted]:bg-surface-muted"
            >
              <span className="min-w-0 flex-1 truncate">{store.name}</span>
              {store.storeId === storeId && <Check size={16} className="shrink-0 text-woori-deep" aria-label="선택됨" />}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}
