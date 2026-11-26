import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown, ChevronRight, CloudRain } from 'lucide-react'
import { sortHomeNotifications } from '@/utils/home'
import { Skeleton } from '@/components/ui/loading'
import { AiLabel } from '@/components/ui/ai-label'

/*
 * 우리 매장 현황 — 재고 카드와 같은 HCI 규칙
 *   목표: 홈을 열고 3초 안에 "오늘 뭘 해야 하지"를 알고, 엄지 한 번으로 처리
 *   - 할 일이 3건뿐이라 중요도 필터를 없앴다 (힉의 법칙: 선택지를 줄인다)
 *   - 색은 왼쪽 막대와 뱃지 두 곳에만. 뱃지는 글자 + 기호(● ◐ ○)로 색 없이도 구분
 *   - 카드 = ① 중요도 · 무엇 ② 핵심 숫자 한 줄 ③ 다음 행동 하나. 수치 표 · 근거는 [현황 자세히] 로 (점진적 공개)
 *   - 큰 파란 버튼은 긴급 카드에만 (카드 폭 전체 · 48px). 나머지는 펼친 뒤 테두리 버튼
 *   - 보조 글자 #4B5563 (흰 바탕 대비 약 7.6:1)
 */
const SUB = 'text-[#4B5563]'
const SEVERITY = {
  urgent: { label: '긴급', mark: '●', badge: 'bg-danger-bg text-danger', bar: 'bg-danger' },
  warning: { label: '주의', mark: '◐', badge: 'bg-warning-bg text-amber-800', bar: 'bg-amber-500' },
  normal: { label: '일반', mark: '○', badge: 'bg-surface-muted text-[#4B5563]', bar: 'bg-[#9CA3AF]' },
}

/** 날씨 한 줄 — 줄 전체가 버튼 (48px). 5일 예보 · 분석 과정은 눌러서 보는 팝업으로 */
function WeatherRow({ onAnalyze }) {
  return (
    <button
      type="button"
      onClick={onAnalyze}
      className="flex min-h-12 w-full items-center gap-3 rounded-input bg-woori-tint px-3 py-2.5 text-left transition-transform duration-100 hover:bg-woori-tint/70 focus-visible:outline-2 focus-visible:outline-woori-blue active:scale-[0.99]"
    >
      <CloudRain size={22} aria-hidden="true" className="shrink-0 text-weather-rain" />
      <span className="min-w-0 flex-1">
        <span className="block text-label font-bold text-ink">내일 비 · 따뜻한 라떼 +14잔 예상</span>
        <span className={`block text-[13px] ${SUB}`}>강수확률 90% · 최저 4°C · 날씨 분석 보기</span>
      </span>
      <ChevronRight size={18} aria-hidden="true" className="shrink-0 text-woori-deep" />
    </button>
  )
}

/** 할 일 카드 하나 */
function TaskCard({ task, approval, open, onToggle }) {
  const s = SEVERITY[task.severity] ?? SEVERITY.normal
  const urgent = task.severity === 'urgent'
  const label = task.actionLabel ?? (approval ? `${approval.title} · ${approval.value}` : '확인하러 가기')

  return (
    <div className="relative flex min-w-0 flex-col gap-3 overflow-hidden rounded-card border border-line bg-white py-4 pr-4 pl-5">
      <span aria-hidden="true" className={`absolute inset-y-0 left-0 w-1 ${s.bar}`} />

      {/* ① 중요도 · 무엇 + ② 핵심 숫자 (붙여서 4px) */}
      <div className="flex flex-col gap-1">
        <span className={`inline-flex w-fit items-center gap-1 rounded-md px-2 py-1 text-[13px] leading-none font-bold ${s.badge}`}>
          <span aria-hidden="true">{s.mark}</span>
          {s.label}
        </span>
        <Link to={task.to} className="mt-1 text-[16px] leading-snug font-bold text-ink hover:text-woori-blue focus-visible:outline-2 focus-visible:outline-woori-blue">
          {task.title}
        </Link>
        {task.headline && <p className={`num text-[13px] ${SUB}`}>{task.headline}</p>}
      </div>

      {/* ③ 다음 행동 — 긴급만 바로 보이는 큰 버튼 */}
      {urgent && (
        <Link
          to={task.to}
          className="inline-flex min-h-12 w-full items-center justify-center rounded-input bg-woori-deep px-4 text-label font-bold text-white transition-transform duration-100 hover:bg-woori-blue active:scale-[0.98]"
        >
          {label}
        </Link>
      )}

      {/* 점진적 공개 — 현황 수치 · 근거 */}
      <button
        type="button"
        aria-expanded={open}
        aria-controls={`briefing-detail-${task.id}`}
        onClick={onToggle}
        className={`-my-2 -ml-2 inline-flex min-h-11 w-fit items-center gap-1 rounded-lg px-2 text-label font-medium ${SUB} hover:bg-surface-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-woori-blue`}
      >
        {open ? '접기' : '현황 자세히'}
        <ChevronDown size={16} aria-hidden="true" className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div id={`briefing-detail-${task.id}`} className="flex flex-col gap-3">
          {task.status?.length ? (
            <dl aria-label="이 항목의 현황 수치" className="flex flex-col gap-1.5 rounded-input bg-surface-muted px-3 py-2.5">
              {task.status.map(({ label: name, value, warn }) => (
                <div key={name} className="flex items-baseline justify-between gap-3 text-[13px]">
                  <dt className={SUB}>{name}</dt>
                  <dd className={`num text-right font-bold ${warn ? 'text-danger' : 'text-ink'}`}>{value}</dd>
                </div>
              ))}
              {task.calc && <p className="mt-0.5 border-t border-line pt-1.5 text-[13px] font-bold text-woori-deep">{task.calc}</p>}
            </dl>
          ) : (
            <p className={`text-[13px] leading-relaxed ${SUB}`}>{task.description}</p>
          )}
          {task.basis && <p className={`text-[12px] ${SUB}`}>근거 · {task.basis}</p>}
          {!urgent && (
            <Link
              to={task.to}
              className="inline-flex min-h-12 w-full items-center justify-center rounded-input border border-woori-deep px-4 text-label font-bold text-woori-deep transition-transform duration-100 hover:bg-woori-tint active:scale-[0.98]"
            >
              {label}
            </Link>
          )}
        </div>
      )}
    </div>
  )
}

/**
 * 우리 매장 현황 = 날씨 한 줄 + 지금 해야 할 일 (긴급 → 주의 → 일반)
 * 이미 일어난 일의 기록은 헤더 알림 패널에서 보여 준다 (같은 내용이 겹치지 않게)
 * @param items     할 일 (features/home/mock.js 의 homeBriefing)
 * @param approvals 승인 · 확인 대기 (할 일과 겹치지 않는 것만 맨 아래 목록으로)
 * @param onWeatherAnalyze 날씨 줄을 눌렀을 때
 */
export default function HomeBriefing({ items, approvals, onWeatherAnalyze, isPending, error }) {
  const [open, setOpen] = useState([]) // 현황을 펼친 할 일 id
  const toggle = (id) => setOpen((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]))
  const tasks = sortHomeNotifications(items)
  const covered = new Set(tasks.map((task) => task.to))
  const remaining = approvals.filter((approval) => !covered.has(approval.to))

  return (
    <section aria-labelledby="home-briefing-title" className="flex min-w-0 flex-col gap-3">
      <div className="flex items-center gap-2">
        <h2 id="home-briefing-title" className="flex items-center gap-1.5 text-h2 font-bold text-ink">
          우리 매장 현황 <AiLabel />
        </h2>
        <span data-coach="home-approvals" className="num rounded-md bg-woori-tint px-2 py-1 text-[13px] leading-none font-bold text-woori-deep">
          할 일 {tasks.length + remaining.length}건
        </span>
        <Link to="/suggestions" className={`-mr-2 ml-auto inline-flex min-h-11 items-center px-2 text-label font-bold text-woori-deep`}>
          전체 보기 ›
        </Link>
      </div>

      {onWeatherAnalyze && <WeatherRow onAnalyze={onWeatherAnalyze} />}

      {error && <p role="alert" className="text-label text-danger">{error.message}</p>}
      {isPending ? (
        <div role="status" aria-label="매장 현황을 불러오는 중이에요" className="flex flex-col gap-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex flex-col gap-2 rounded-card border border-line p-4">
              <Skeleton className="h-4 w-1/5" />
              <Skeleton className="h-5 w-4/5" />
              <Skeleton className="h-3 w-3/5" />
            </div>
          ))}
        </div>
      ) : tasks.length === 0 ? (
        <p role="status" className={`rounded-card border border-line py-8 text-center text-label ${SUB}`}>
          지금 해야 할 일이 없어요.
        </p>
      ) : (
        <ul aria-label="지금 해야 할 일" className="flex flex-col gap-3">
          {tasks.map((task) => (
            <li key={task.id}>
              <TaskCard
                task={task}
                approval={approvals.find((item) => item.to === task.to)}
                open={open.includes(task.id)}
                onToggle={() => toggle(task.id)}
              />
            </li>
          ))}
        </ul>
      )}

      {/* 할 일 카드에 없는 확인 대기 — 한 줄씩 (48px) */}
      {remaining.length > 0 && (
        <ul aria-label="추가로 확인할 일" className="flex flex-col divide-y divide-line rounded-card border border-line bg-white px-4">
          {remaining.map((approval) => (
            <li key={approval.to}>
              <Link to={approval.to} className="flex min-h-12 items-center gap-2 text-label">
                <span className="min-w-0 flex-1 font-medium text-ink">{approval.title}</span>
                <span className="num shrink-0 font-bold text-woori-deep">{approval.value}</span>
                <ChevronRight size={16} aria-hidden="true" className="shrink-0 text-woori-deep" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
