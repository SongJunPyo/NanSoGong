import { useRef, useState } from 'react'
import { Popover } from 'radix-ui'
import { Info } from 'lucide-react'
import { useCanHover } from '@/hooks/useViewport'

/**
 * 어려운 숫자 풀이 (검색 관심도 · 원가율 · 개당가 · 산출 근거 …) — 사장님이 궁금할 때만 본다
 *   웹(마우스): ⓘ 에 마우스를 올리면 표시
 *   앱(터치): ⓘ 를 누르면 표시, 바깥을 누르면 닫힘
 *   키보드: Tab 으로 ⓘ 에 가서 Enter
 *
 *   원가율 <Tooltip label="원가율 설명">판매가에서 재료비가 차지하는 비율이에요</Tooltip>
 */
export function Tooltip({ label = '자세히 보기', children, side = 'top', size = 16 }) {
  const canHover = useCanHover()
  const [open, setOpen] = useState(false)
  const closeTimer = useRef()

  // 마우스가 ⓘ 와 말풍선 사이를 지나갈 때 깜빡이지 않게 조금 늦게 닫는다
  const hoverProps = canHover
    ? {
        onMouseEnter: () => {
          clearTimeout(closeTimer.current)
          setOpen(true)
        },
        onMouseLeave: () => {
          closeTimer.current = setTimeout(() => setOpen(false), 120)
        },
      }
    : {}

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger
        aria-label={label}
        className="inline-flex size-6 shrink-0 items-center justify-center rounded-full align-middle text-ink-mute hover:text-woori-blue focus-visible:outline-2 focus-visible:outline-woori-blue"
        {...hoverProps}
      >
        <Info size={size} aria-hidden="true" />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          side={side}
          sideOffset={6}
          collisionPadding={12}
          onOpenAutoFocus={(e) => e.preventDefault()}
          className="animate-fade-in z-[80] max-w-[260px] rounded-lg bg-ink px-3 py-2.5 text-caption leading-relaxed text-white shadow-lg outline-none"
          {...hoverProps}
        >
          {children}
          <Popover.Arrow className="fill-ink" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
