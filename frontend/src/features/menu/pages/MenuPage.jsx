import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { Screen } from '@/components/common/layout'
import { Button, Card, Divider, HeadRow, KV, P, Pill } from '@/components/common/ui'
import { won } from '@/lib/format'
import { useMenus } from '@/features/menu/queries'
import MenuTabs from '@/features/menu/components/MenuTabs'
import { Badge } from '@/components/ui/badge'

/** 31 메뉴 목록 (UF-15) — 메뉴를 누르면 그 메뉴 정보가 아래로 펼쳐진다 */
export default function MenuPage() {
  const { data: menus } = useMenus()
  const [openId, setOpenId] = useState(null)

  return (
    <Screen title="메뉴" back={false} tab>
      <MenuTabs />
      <Card tone="line" gap="gap-0" pad="px-4 py-1">
        {menus.map((m, i) => {
          const open = openId === m.id
          const costRate = Math.round((m.cost / m.price) * 100)
          return (
            <div key={m.id} className={i > 0 ? 'border-t border-line' : undefined}>
              <button
                type="button"
                aria-expanded={open}
                aria-controls={`menu-detail-${m.id}`}
                onClick={() => setOpenId(open ? null : m.id)}
                className="flex min-h-[54px] w-full items-center gap-1.5 py-3 text-left"
              >
                <span className="min-w-0 flex-1 text-body text-ink-sub">{m.name}</span>
                <span className="num shrink-0 text-body font-bold text-woori-blue">{m.value}</span>
                <ChevronDown
                  size={16}
                  strokeWidth={2.4}
                  className={`shrink-0 text-woori-blue transition-transform ${open ? 'rotate-180' : ''}`}
                />
              </button>
              {open && (
                <div id={`menu-detail-${m.id}`} className="animate-step-in mb-3 flex flex-col gap-2 rounded-input bg-surface-muted p-4">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Pill tone="gray">{m.category}</Pill>
                    {m.pos ? <Badge status="done">POS 연결됨</Badge> : <Badge status="pending">POS 미연결</Badge>}
                  </div>
                  <KV label="판매가" value={`${won(m.price)}원`} />
                  <KV label="원가" value={`${won(m.cost)}원 · 원가율 ${costRate}%`} />
                  <KV label="1잔 이익" value={`${won(m.price - m.cost)}원`} tone="deep" />
                  <Divider />
                  <p className="text-caption font-bold text-ink-sub">레시피</p>
                  {m.recipe.map((r) => (
                    <KV key={r.name} label={r.name} value={r.amount} />
                  ))}
                  <Button variant="secondary" to={`/menu/${m.id}/edit`} className="mt-1">
                    메뉴·레시피 편집
                  </Button>
                </div>
              )}
            </div>
          )
        })}
      </Card>
      <Card tone="line">
        <HeadRow title="시즌 음료" size="text-[15px]">
          <Pill tone="gray">판매 중지</Pill>
        </HeadRow>
        <P tone="warn" small>
          POS 메뉴 연결 필요
        </P>
      </Card>
      <Button to="/menu/new/edit">+ 메뉴 추가</Button>
    </Screen>
  )
}
