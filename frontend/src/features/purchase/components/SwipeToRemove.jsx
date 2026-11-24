import { useRef, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { useIsDesktop } from '@/hooks/useViewport'

const THRESHOLD = 88 // 이만큼(px) 왼쪽으로 밀면 뺀다

/**
 * 앱: 왼쪽으로 밀어서 빼기 (뒤에 빨간 '빼기' 표시가 드러난다)
 * 웹: 밀기 없이 그대로 — 빼기는 행 안의 버튼으로 한다
 * 밀기를 못 쓰는 사람도 뺄 수 있게, 화면은 항상 따로 '빼기' 버튼을 함께 둔다
 */
export default function SwipeToRemove({ onRemove, children }) {
  const desktop = useIsDesktop()
  const [dx, setDx] = useState(0)
  const [dragging, setDragging] = useState(false)
  const start = useRef(null)

  if (desktop) return children

  const down = (e) => {
    start.current = { x: e.clientX, y: e.clientY, locked: null }
    setDragging(true)
  }
  const move = (e) => {
    const s = start.current
    if (!s) return
    const mx = e.clientX - s.x
    const my = e.clientY - s.y
    // 처음 움직인 방향으로 고정 — 세로면 화면 스크롤에 맡긴다
    if (s.locked === null && Math.abs(mx) + Math.abs(my) > 8) s.locked = Math.abs(mx) > Math.abs(my) ? 'x' : 'y'
    if (s.locked === 'x') setDx(Math.min(0, mx))
  }
  const up = () => {
    const removed = dx <= -THRESHOLD
    start.current = null
    setDragging(false)
    setDx(0)
    if (removed) onRemove()
  }

  return (
    <div className="relative overflow-hidden rounded-input">
      <div aria-hidden="true" className="absolute inset-0 flex items-center justify-end gap-1.5 bg-danger pr-5 text-label font-bold text-white">
        <Trash2 size={18} />
        빼기
      </div>
      <div
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        className="relative touch-pan-y bg-white"
        style={{ transform: `translateX(${dx}px)`, transition: dragging ? 'none' : 'transform 200ms ease-out' }}
      >
        {children}
      </div>
    </div>
  )
}
