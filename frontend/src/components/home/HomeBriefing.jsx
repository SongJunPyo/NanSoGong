import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { HOME_SEVERITIES, sortHomeNotifications } from '@/utils/home'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/loading'

// 중요한 순서대로 진하게 — 긴급은 연한 빨강, 주의는 연한 주황, 일반은 흰 바탕 (읽음 여부는 글자 굵기로만 구분)
const SEVERITY_BG = {
  urgent: 'bg-danger-bg hover:bg-[#fde3de]',
  warning: 'bg-warning-bg hover:bg-[#fdefc9]',
}

export default function HomeBriefing({ notifications, approvals, onRead, isPending, error }) {
  const [filter, setFilter] = useState('all')
  const sorted = sortHomeNotifications(notifications)
  const visible = sorted.filter((notification) => filter === 'all' || notification.severity === filter)
  const representedActions = new Set(visible.map((notification) => notification.to))
  const remainingApprovals = approvals.filter((approval) => !representedActions.has(approval.to))
  const filters = [{ key: 'all', label: '전체' }, ...Object.entries(HOME_SEVERITIES).map(([key, value]) => ({ key, ...value }))]

  return (
    <section aria-labelledby="home-briefing-title" className="min-w-0 rounded-card border border-line bg-white p-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h2 id="home-briefing-title" className="text-h2 font-bold text-ink">AI 운영 브리핑</h2>
        <span data-coach="home-approvals">
          <Badge status={approvals.length ? 'pending' : 'neutral'}>할 일 {approvals.length}건</Badge>
        </span>
        <Link to="/suggestions" className="ml-auto text-caption font-bold text-woori-blue">전체 보기 ›</Link>
      </div>

      <div role="group" aria-label="알림 중요도 필터" className="mb-2 flex flex-wrap gap-1.5">
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
        <div role="status" aria-label="알림을 불러오는 중이에요" className="flex flex-col gap-3 py-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex flex-col gap-1.5 px-2">
              <Skeleton className="h-4 w-4/5" />
              <Skeleton className="h-3 w-3/5" />
            </div>
          ))}
        </div>
      ) : visible.length === 0 ? (
        <p role="status" className="py-6 text-center text-label text-ink-sub">해당하는 알림이 없어요.</p>
      ) : (
        <ul aria-label="운영 알림" className="divide-y divide-line">
          {visible.map((notification) => {
            const severity = HOME_SEVERITIES[notification.severity]
            const approval = approvals.find((item) => item.to === notification.to)
            return (
              <li key={notification.id}>
                <Link
                  to={notification.to} onClick={() => onRead(notification.id)}
                  className={`flex min-w-0 items-start gap-2 rounded-lg px-2 py-2.5 transition-colors ${SEVERITY_BG[notification.severity] ?? 'hover:bg-surface-muted'}`}
                >
                  <span aria-hidden="true" className={`mt-1.5 size-1.5 shrink-0 rounded-full ${severity.dot}`} />
                  <div className="min-w-0 flex-1">
                    <p className={`text-label leading-snug text-ink ${notification.read ? 'font-medium' : 'font-bold'}`}>
                      <span className={`mr-1.5 text-caption font-bold ${severity.text}`}>{severity.label}</span>
                      {notification.title}
                    </p>
                    <p className="mt-1 line-clamp-1 text-caption text-ink-sub">{notification.description}</p>
                    {approval && <p className="mt-1 text-caption font-bold text-woori-blue">{approval.title} · {approval.value} ›</p>}
                  </div>
                  <ChevronRight size={14} aria-hidden="true" className="mt-1 shrink-0 text-ink-mute" />
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
