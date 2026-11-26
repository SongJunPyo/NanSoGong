import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown, ChevronRight, Sparkles } from 'lucide-react'
import { WeatherIcon } from '@/components/common/ui'
import { HOME_SEVERITIES, sortHomeNotifications } from '@/utils/home'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/loading'
import { AiLabel } from '@/components/ui/ai-label'

// 항목마다 카드 하나. 왼쪽 색 막대로 중요도를 보이고, 긴급만 연한 빨강 바탕으로 가장 진하게 한다
const SEVERITY_CARD = {
  urgent: { card: 'border-danger/25 bg-danger-bg/60 hover:bg-danger-bg', bar: 'bg-danger', chip: 'bg-danger text-white' },
  warning: { card: 'border-line bg-white hover:bg-surface-muted', bar: 'bg-amber-500', chip: 'bg-warning-bg text-amber-700' },
  normal: { card: 'border-line bg-white hover:bg-surface-muted', bar: 'bg-success', chip: 'bg-success-bg text-success' },
}

/** 브리핑 맨 위 날씨 줄 — 날씨로 본 수요 예측 한 줄 + 5일 예보, [AI 분석] 은 팝업으로 */
function BriefingWeather({ forecast, onAnalyze }) {
  return (
    <div aria-label="날씨 기반 수요 예측" className="mb-3 flex flex-col gap-2 rounded-input bg-woori-tint p-3">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-label font-bold text-ink">내일 비 · 따뜻한 라떼 14잔 더 팔릴 것 같아요</p>
          <p className="mt-0.5 text-caption text-ink-sub">강수확률 90% · 최저 4°C · 최근 판매와 날씨를 반영했어요.</p>
        </div>
        <button
          type="button"
          onClick={onAnalyze}
          className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-woori-blue px-2.5 py-1.5 text-caption font-bold text-white hover:bg-woori-deep"
        >
          <Sparkles size={14} aria-hidden="true" />
          AI 분석
        </button>
      </div>
      <div className="grid grid-cols-5 gap-1 border-t border-woori-blue/10 pt-2">
        {forecast.map(({ d, w, t }) => (
          <div key={d} className="flex flex-col items-center justify-center gap-1 text-caption sm:flex-row">
            <span className="text-ink-sub">{d}</span>
            <span className="inline-flex items-center gap-1">
              <WeatherIcon type={w} size={16} />
              <span className="num font-bold text-ink">{t}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * 우리 매장 현황 = 날씨로 본 수요 예측 + 지금 해야 할 일 (중요도순: 긴급 → 주의 → 일반)
 * 이미 일어난 일의 기록은 헤더 알림 패널에서 보여 준다 (같은 내용이 겹치지 않게)
 * @param items     브리핑 항목 (features/home/mock.js 의 homeBriefing)
 * @param aiSummary 오늘 AI가 한 일 (맨 위 회색 요약 줄)
 * @param forecast  5일 예보 (없으면 날씨 줄을 그리지 않는다)
 * @param onWeatherAnalyze [AI 분석] 버튼
 */
export default function HomeBriefing({ items, approvals, aiSummary, forecast, onWeatherAnalyze, isPending, error }) {
  const notifications = items
  const [filter, setFilter] = useState('all')
  const [open, setOpen] = useState([]) // 상세를 펼친 항목 id
  const toggle = (id) => setOpen((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]))
  const sorted = sortHomeNotifications(notifications)
  const visible = sorted.filter((notification) => filter === 'all' || notification.severity === filter)
  const representedActions = new Set(visible.map((notification) => notification.to))
  const remainingApprovals = approvals.filter((approval) => !representedActions.has(approval.to))
  const filters = [{ key: 'all', label: '전체' }, ...Object.entries(HOME_SEVERITIES).map(([key, value]) => ({ key, ...value }))]

  return (
    <section aria-labelledby="home-briefing-title" className="min-w-0 rounded-card border border-line bg-white p-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h2 id="home-briefing-title" className="flex items-center gap-1.5 text-h2 font-bold text-ink">
          우리 매장 현황 <AiLabel />
        </h2>
        <span data-coach="home-approvals">
          <Badge status={approvals.length ? 'pending' : 'neutral'}>할 일 {approvals.length}건</Badge>
        </span>
        <Link to="/suggestions" className="ml-auto text-caption font-bold text-woori-blue">전체 보기 ›</Link>
      </div>

      {aiSummary && (
        <p className="mb-2 text-caption text-ink-sub">
          발주안 {aiSummary.orderDrafts}건과 {aiSummary.priceCompared}곳 가격 비교를 미리 준비해 약 {aiSummary.minutesSaved}분을 아꼈어요.
        </p>
      )}

      {forecast && <BriefingWeather forecast={forecast} onAnalyze={onWeatherAnalyze} />}

      <div role="group" aria-label="할 일 중요도 필터" className="mb-2 flex flex-wrap gap-1.5">
        {filters.map(({ key, label, dot, filter: selectedStyle }) => {
          const count = key === 'all' ? notifications.length : notifications.filter((item) => item.severity === key).length
          const selected = filter === key
          return (
            <button
              key={key} type="button" aria-pressed={selected} onClick={() => setFilter(key)}
              className={`inline-flex min-h-8 items-center gap-1 rounded-lg px-2 text-caption font-bold focus-visible:outline-2 focus-visible:outline-woori-blue ${
                selected ? selectedStyle ?? 'bg-woori-tint text-woori-deep' : 'bg-surface-muted text-ink-sub hover:bg-woori-tint'
              }`}
            >
              {dot && <span aria-hidden="true" className={`size-1.5 rounded-full ${dot}`} />}
              {label}<span className="num">{count}</span>
            </button>
          )
        })}
      </div>

      {error && <p role="alert" className="py-2 text-caption text-danger">{error.message}</p>}
      {isPending ? (
        <div role="status" aria-label="매장 현황을 불러오는 중이에요" className="flex flex-col gap-3 py-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex flex-col gap-1.5 px-2">
              <Skeleton className="h-4 w-4/5" />
              <Skeleton className="h-3 w-3/5" />
            </div>
          ))}
        </div>
      ) : visible.length === 0 ? (
        <p role="status" className="py-6 text-center text-label text-ink-sub">해당하는 할 일이 없어요.</p>
      ) : (
        <ul aria-label="지금 해야 할 일" className="flex flex-col gap-2">
          {visible.map((notification) => {
            const severity = HOME_SEVERITIES[notification.severity]
            const look = SEVERITY_CARD[notification.severity] ?? SEVERITY_CARD.normal
            const approval = approvals.find((item) => item.to === notification.to)
            return (
              <li key={notification.id}>
                {/* 접힌 상태에서는 중요도 + 제목만. [더보기] 로 설명 · 근거 · 승인 버튼을 펼친다 */}
                <div className={`relative flex min-w-0 flex-col overflow-hidden rounded-input border py-2.5 pr-2 pl-4 transition-colors ${look.card}`}>
                  <span aria-hidden="true" className={`absolute inset-y-0 left-0 w-1 ${look.bar}`} />
                  <div className="flex items-center gap-2">
                    <span className={`shrink-0 rounded-md px-1.5 py-0.5 text-[11px] font-bold ${look.chip}`}>{severity.label}</span>
                    <Link
                      to={notification.to}
                      className="min-w-0 flex-1 text-label leading-snug font-bold text-ink hover:text-woori-blue focus-visible:outline-2 focus-visible:outline-woori-blue"
                    >
                      {notification.title}
                    </Link>
                    <button
                      type="button"
                      aria-expanded={open.includes(notification.id)}
                      aria-controls={`briefing-detail-${notification.id}`}
                      onClick={() => toggle(notification.id)}
                      className="inline-flex min-h-8 shrink-0 items-center gap-0.5 rounded-lg px-1.5 text-caption font-bold text-ink-sub hover:bg-white/70 hover:text-ink focus-visible:outline-2 focus-visible:outline-woori-blue"
                    >
                      {open.includes(notification.id) ? '접기' : '더보기'}
                      <ChevronDown
                        size={14}
                        aria-hidden="true"
                        className={`transition-transform ${open.includes(notification.id) ? 'rotate-180' : ''}`}
                      />
                    </button>
                  </div>
                  {open.includes(notification.id) && (
                    <div id={`briefing-detail-${notification.id}`} className="flex flex-col gap-1.5 pt-2 pr-1.5">
                      {/* 우리 매장 현황 — 숫자로 */}
                      {notification.status?.length ? (
                        <dl aria-label="이 항목의 현황 수치" className="flex flex-col gap-1 rounded-lg bg-white/80 px-3 py-2">
                          {notification.status.map(({ label, value, warn }) => (
                            <div key={label} className="flex items-baseline justify-between gap-3 text-caption">
                              <dt className="text-ink-sub">{label}</dt>
                              <dd className={`num text-right font-bold ${warn ? 'text-danger' : 'text-ink'}`}>{value}</dd>
                            </div>
                          ))}
                          {notification.calc && (
                            <p className="mt-0.5 border-t border-line pt-1.5 text-caption font-bold text-woori-deep">{notification.calc}</p>
                          )}
                        </dl>
                      ) : (
                        <p className="text-caption leading-relaxed text-ink-sub">{notification.description}</p>
                      )}
                      {notification.basis && (
                        <p className="text-[11px] leading-snug text-ink-mute">근거 · {notification.basis}</p>
                      )}
                      <Link
                        to={notification.to}
                        className="ml-auto inline-flex shrink-0 items-center gap-0.5 rounded-lg bg-woori-tint px-2.5 py-1 text-caption font-bold text-woori-deep focus-visible:outline-2 focus-visible:outline-woori-blue"
                      >
                        {approval ? `${approval.title} · ${approval.value}` : '확인하러 가기'}
                        <ChevronRight size={14} aria-hidden="true" />
                      </Link>
                    </div>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {remainingApprovals.length > 0 && (
        <div aria-label="추가 확인할 일" className="mt-2 border-t border-line pt-2">
          {remainingApprovals.map((approval) => (
            <Link key={approval.to} to={approval.to} className="flex min-h-8 items-center gap-2 rounded-lg px-2 py-1 text-caption hover:bg-surface-muted">
              <span className="min-w-0 flex-1 text-ink-sub">{approval.title}</span>
              <span className="shrink-0 font-bold text-woori-blue">{approval.value}</span>
              <ChevronRight size={14} aria-hidden="true" className="shrink-0 text-woori-blue" />
            </Link>
          ))}
        </div>
      )}

    </section>
  )
}
