import { useCallback, useEffect, useLayoutEffect, useState } from 'react'
import { createPortal } from 'react-dom'

const cx = (...a) => a.filter(Boolean).join(' ')

// 본 안내 기억 — 안내 key 만 localStorage 에 둔다 (토큰 · 개인정보 아님)
const STORAGE_PREFIX = 'nansogong-coach-seen:'
const seen = (key) => {
  try {
    return localStorage.getItem(STORAGE_PREFIX + key) === '1'
  } catch {
    return false
  }
}
const markSeen = (key) => {
  try {
    localStorage.setItem(STORAGE_PREFIX + key, '1')
  } catch {
    /* 저장이 막힌 브라우저면 다음에 다시 보일 수 있다 */
  }
}

/** 안내를 다시 보이게 (설정 · 개발용) */
export const resetCoachMark = (key) => {
  try {
    localStorage.removeItem(STORAGE_PREFIX + key)
  } catch {
    /* 무시 */
  }
}

const PAD = 6
const CARD_W = 300

/**
 * 첫 로그인 순서 안내 — 웹 · 앱 같은 모습
 *   안내할 요소에 data-coach="승인대기" 처럼 표시를 달고, steps 의 target 에 같은 이름을 준다
 *   한 번 끝내거나 [건너뛰기] 하면 storageKey 로 기억해서 다시 띄우지 않는다
 *
 *   <CoachMark storageKey="home-v1" steps={[
 *     { target: 'approvals', title: '승인 대기', body: 'AI가 준비한 일을 여기서 확인해요' },
 *   ]} />
 *
 * @param {boolean} enabled  false 면 띄우지 않는다 (예: 데이터를 다 불러온 뒤에 켜기)
 */
export function CoachMark({ storageKey, steps, enabled = true, onFinish }) {
  const [done, setDone] = useState(() => seen(storageKey))
  const [index, setIndex] = useState(0)
  const [rect, setRect] = useState(null)
  // enabled 가 나중에 true 가 되면 (데이터 로딩 후) 그때부터 보인다
  const step = enabled && !done ? steps[index] : null

  const measure = useCallback(() => {
    if (!step) return
    const el = document.querySelector(`[data-coach="${step.target}"]`)
    if (!el) {
      setRect(null)
      return
    }
    setRect(el.getBoundingClientRect())
  }, [step])

  useLayoutEffect(() => {
    if (!step) return
    const el = document.querySelector(`[data-coach="${step.target}"]`)
    el?.scrollIntoView({ block: 'center', behavior: 'instant' })
    const frame = requestAnimationFrame(measure)
    window.addEventListener('resize', measure)
    window.addEventListener('scroll', measure, true)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('resize', measure)
      window.removeEventListener('scroll', measure, true)
    }
  }, [step, measure])

  const finish = () => {
    markSeen(storageKey)
    setDone(true)
    onFinish?.()
  }

  useEffect(() => {
    if (!step) return
    const onKey = (e) => e.key === 'Escape' && finish()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  })

  if (!step) return null

  const last = index === steps.length - 1
  const vw = window.innerWidth
  const vh = window.innerHeight

  // 안내 카드 위치: 대상 아래에 자리가 있으면 아래, 없으면 위. 대상을 못 찾으면 화면 가운데
  let cardStyle
  if (rect) {
    const below = rect.bottom + 12 + 180 < vh
    const left = Math.min(Math.max(12, rect.left + rect.width / 2 - CARD_W / 2), vw - CARD_W - 12)
    cardStyle = below ? { top: rect.bottom + PAD + 10, left } : { bottom: vh - rect.top + PAD + 10, left }
  } else {
    cardStyle = { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }
  }

  return createPortal(
    <div className="fixed inset-0 z-[75]" role="dialog" aria-modal="true" aria-label="처음 사용 안내">
      {/* 대상만 밝게 뚫어 두는 막 (큰 그림자로 나머지를 어둡게) */}
      {rect ? (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed rounded-card transition-all duration-200"
          style={{
            top: rect.top - PAD,
            left: rect.left - PAD,
            width: rect.width + PAD * 2,
            height: rect.height + PAD * 2,
            boxShadow: '0 0 0 9999px rgb(0 0 0 / 0.55)',
          }}
        />
      ) : (
        <div aria-hidden="true" className="fixed inset-0 bg-black/55" />
      )}
      <div
        className="animate-toast-top fixed flex flex-col gap-2 rounded-card bg-white p-5 shadow-xl"
        style={{ width: CARD_W, ...cardStyle }}
      >
        <p className="num text-caption font-bold text-woori-blue">
          {index + 1} / {steps.length}
        </p>
        <h3 className="text-h2 font-bold text-ink">{step.title}</h3>
        {step.body && <p className="text-label text-ink-sub">{step.body}</p>}
        <div className="mt-2 flex items-center gap-2">
          {!last && (
            <button type="button" onClick={finish} className="h-10 px-1 text-label font-medium text-ink-sub">
              건너뛰기
            </button>
          )}
          <button
            type="button"
            autoFocus
            onClick={() => (last ? finish() : setIndex(index + 1))}
            className={cx('ml-auto h-10 rounded-button bg-woori-deep px-5 text-label font-bold text-white')}
          >
            {last ? '시작하기' : '다음'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
