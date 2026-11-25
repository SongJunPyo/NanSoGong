import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
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

/**
 * AI 운영 브리핑 = 지금 해야 할 일 (중요도순: 긴급 → 주의 → 일반)
 * 이미 일어난 일의 기록은 헤더 알림 패널에서 보여 준다 (같은 내용이 겹치지 않게)
 * @param items     브리핑 항목 (features/home/mock.js 의 homeBriefing)
 * @param aiSummary 오늘 AI가 한 일 (맨 위 회색 요약 줄)
 */
export default function HomeBriefing({ items, approvals, aiSummary, isPending, error }) {
  const notifications = items
  const [filter, setFilter] = useState('all')
  const sorted = sortHomeNotifications(notifications)
  const visible = sorted.filter((notification) => filter === 'all' || notification.severity === filter)
  const representedActions = new Set(visible.map((notification) => notification.to))
  const remainingApprovals = approvals.filter((approval) => !representedActions.has(approval.to))
  const filters = [{ key: 'all', label: '전체' }, ...Object.entries(HOME_SEVERITIES).map(([key, value]) => ({ key, ...value }))]

  return (
    <section aria-labelledby="home-briefing-title" className="min-w-0 rounded-card border border-line bg-white p-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h2 id="home-briefing-title" className="flex items-center gap-1.5 text-h2 font-bold text-ink">
          매장 데이터 기반 운영 브리핑 <AiLabel />
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
        <div role="status" aria-label="브리핑을 불러오는 중이에요" className="flex flex-col gap-3 py-2">
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
                <Link
                  to={notification.to}
                  className={`relative flex min-w-0 flex-col gap-1.5 overflow-hidden rounded-input border py-3 pr-3 pl-4 transition-colors focus-visible:outline-2 focus-visible:outline-woori-blue ${look.card}`}
                >
                  <span aria-hidden="true" className={`absolute inset-y-0 left-0 w-1 ${look.bar}`} />
                  <div className="flex items-start gap-2">
                    <span className={`mt-px shrink-0 rounded-md px-1.5 py-0.5 text-[11px] font-bold ${look.chip}`}>{severity.label}</span>
                    <p className="min-w-0 flex-1 text-label leading-snug font-bold text-ink">{notification.title}</p>
                    {!approval && <ChevronRight size={16} aria-hidden="true" className="mt-0.5 shrink-0 text-ink-mute" />}
                  </div>
                  <p className="line-clamp-2 text-caption leading-relaxed text-ink-sub">{notification.description}</p>
                  {(notification.basis || approval) && (
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 pt-0.5">
                      {notification.basis && (
                        <span className="min-w-0 flex-1 text-[11px] leading-snug text-ink-mute">근거 · {notification.basis}</span>
                      )}
                      {approval && (
                        <span className="ml-auto inline-flex shrink-0 items-center gap-0.5 rounded-lg bg-woori-tint px-2.5 py-1 text-caption font-bold text-woori-deep">
                          {approval.title} · {approval.value}
                          <ChevronRight size={14} aria-hidden="true" />
                        </span>
                      )}
                    </div>
                  )}
                </Link>
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
