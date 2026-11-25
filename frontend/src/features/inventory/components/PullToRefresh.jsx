import { useRef, useState } from 'react'
import { ArrowDown } from 'lucide-react'
import { useIsDesktop } from '@/hooks/useViewport'
import { Spinner } from '@/components/ui/loading'

const TRIGGER = 72 // 이만큼(px) 당기면 새로고침
const MAX = 110

/**
 * 앱: 화면 맨 위에서 아래로 당기면 새로고침 (onRefresh 는 Promise 를 돌려준다 — 예: refetch)
 * 웹: 당기기 없이 그대로
 */
export default function PullToRefresh({ onRefresh, children }) {
  const desktop = useIsDesktop()
  const [pull, setPull] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const startY = useRef(null)

  if (desktop) return children

  const onTouchStart = (e) => {
    if (window.scrollY > 0 || refreshing) return
    startY.current = e.touches[0].clientY
  }
  const onTouchMove = (e) => {
    if (startY.current == null) return
    const dy = e.touches[0].clientY - startY.current
    setPull(dy > 0 ? Math.min(MAX, dy * 0.5) : 0)
  }
  const onTouchEnd = async () => {
    if (startY.current == null) return
    startY.current = null
    if (pull >= TRIGGER) {
      setRefreshing(true)
      setPull(48)
      try {
        await onRefresh()
      } finally {
        setRefreshing(false)
        setPull(0)
      }
    } else {
      setPull(0)
    }
  }

  return (
    <div onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd} className="flex flex-col gap-4">
      <div
        aria-live="polite"
        className="flex items-end justify-center overflow-hidden text-caption text-ink-sub transition-[height] duration-150"
        style={{ height: pull, marginBottom: pull ? 0 : -16 }}
      >
        {refreshing ? (
          <Spinner size={18} showLabel label="새로 불러오고 있어요" className="pb-2" />
        ) : (
          pull > 0 && (
            <span className="flex items-center gap-1 pb-2">
              <ArrowDown size={16} className={pull >= TRIGGER ? 'rotate-180 transition-transform' : 'transition-transform'} />
              {pull >= TRIGGER ? '놓으면 새로고침해요' : '당겨서 새로고침'}
            </span>
          )
        )}
      </div>
      {children}
    </div>
  )
}
