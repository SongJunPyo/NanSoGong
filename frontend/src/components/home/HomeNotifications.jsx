import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bell, X } from 'lucide-react'
import { HOME_RESULTS, HOME_SEVERITIES, sortNotificationLog } from '@/utils/home'
import { formatNotificationTime } from '@/utils/format'
import { useHomeNotifications } from '@/hooks/useHomeNotifications'

/** 주요 탭의 헤더에서 같은 매장의 알림과 읽음 상태를 공유한다. */
export function HeaderNotifications() {
  const alerts = useHomeNotifications()
  return (
    <HomeNotifications
      notifications={alerts.notifications} unreadCount={alerts.unreadCount}
      onRead={alerts.markRead} onReadAll={alerts.markAllRead}
      onRemove={alerts.remove} onRemoveRead={alerts.removeRead}
      isPending={alerts.isPending} isSaving={alerts.isSaving} error={alerts.error}
    />
  )
}

export default function HomeNotifications({ notifications, unreadCount, onRead, onReadAll, onRemove, onRemoveRead, isPending, isSaving, error }) {
  const readCount = notifications.filter((item) => item.read).length
  const [open, setOpen] = useState(false)
  const container = useRef(null)
  const trigger = useRef(null)
  const panel = useRef(null)

  useEffect(() => {
    if (!open) return
    panel.current?.focus()
    const onOutsideClick = (event) => {
      if (!container.current?.contains(event.target)) setOpen(false)
    }
    const onEscape = (event) => {
      if (event.key === 'Escape') {
        setOpen(false)
        trigger.current?.focus()
      }
    }
    document.addEventListener('pointerdown', onOutsideClick)
    document.addEventListener('keydown', onEscape)
    return () => {
      document.removeEventListener('pointerdown', onOutsideClick)
      document.removeEventListener('keydown', onEscape)
    }
  }, [open])

  return (
    <div ref={container}>
      <button
        ref={trigger} type="button" aria-label={`알림, 읽지 않은 알림 ${unreadCount}개`}
        aria-haspopup="dialog" aria-expanded={open} aria-controls="home-notification-panel"
        onClick={() => setOpen((value) => !value)}
        className="group relative flex size-10 items-center justify-center rounded-lg text-ink hover:bg-white/80 focus-visible:outline-2 focus-visible:outline-woori-blue"
      >
        <Bell size={24} strokeWidth={1.8} aria-hidden="true" className="transition-transform duration-150 group-hover:scale-115 group-focus-visible:scale-115" />
        {!open && <span aria-hidden="true" className="pointer-events-none absolute top-full left-1/2 z-40 mt-1 -translate-x-1/2 whitespace-nowrap rounded-md bg-ink px-2 py-0.5 text-[11px] font-bold text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">알림</span>}
        {unreadCount > 0 && <span aria-hidden="true" data-unread-indicator className="absolute top-2 right-2 size-2 rounded-full bg-danger ring-2 ring-white" />}
      </button>
      {open && (
        <div
          ref={panel} id="home-notification-panel" role="dialog" aria-label="알림 목록" tabIndex={-1}
          className="absolute top-[calc(100%+8px)] right-0 z-50 w-[min(360px,calc(100vw-40px))] overflow-hidden rounded-card border border-line bg-white shadow-lg outline-none"
        >
          <div className="flex items-center gap-2 border-b border-line px-4 py-3">
            <h2 className="text-base font-bold text-ink">알림</h2>
            <span aria-live="polite" className="text-caption font-bold text-woori-blue">읽지 않음 {unreadCount}개</span>
            <button type="button" disabled={unreadCount === 0 || isSaving} onClick={onReadAll} className="ml-auto text-caption font-bold text-woori-blue disabled:text-ink-mute">모두 읽음</button>
            {onRemoveRead && (
              <button type="button" disabled={readCount === 0 || isSaving} onClick={onRemoveRead} className="text-caption font-bold text-ink-sub disabled:text-ink-mute">읽은 알림 지우기</button>
            )}
            <button type="button" aria-label="알림 닫기" onClick={() => { setOpen(false); trigger.current?.focus() }} className="rounded p-1 text-ink-sub hover:bg-surface-muted">
              <X size={18} aria-hidden="true" />
            </button>
          </div>
          {error && <p role="alert" className="px-4 py-2 text-caption text-danger">{error.message}</p>}
          <ul className="max-h-[min(60dvh,420px)] overflow-y-auto overscroll-contain">
            {/* 알림 = 이미 일어난 일의 기록. 읽지 않은 긴급만 위에 고정, 나머지는 최근순 */}
            {sortNotificationLog(notifications).map((notification) => {
              // 실행 결과가 있으면 결과(성공 · 부분 성공 …)로, 없으면 중요도로 표시
              const severity = HOME_RESULTS[notification.result] ?? HOME_SEVERITIES[notification.severity]
              return (
                <li key={notification.id} className="group/item relative">
                  <Link
                    to={notification.to} onClick={() => { onRead(notification.id); setOpen(false) }}
                    className={`flex gap-2.5 border-b border-line px-4 py-3 last:border-b-0 hover:bg-surface-muted ${notification.read ? 'bg-white' : 'bg-woori-tint/70'}`}
                  >
                    <span aria-hidden="true" className={`mt-1.5 size-1.5 shrink-0 rounded-full ${severity.dot}`} />
                    <div className="min-w-0 flex-1 pr-6">
                      <p className={`text-label text-ink ${notification.read ? 'font-medium' : 'font-bold'}`}>
                        <span className={`mr-1.5 text-caption font-bold ${severity.text}`}>{severity.label}</span>
                        {notification.title}
                      </p>
                      <p className="mt-1 text-caption text-ink-sub">{notification.description}</p>
                      <time dateTime={notification.createdAt} className="mt-1 block text-caption text-ink-mute">{formatNotificationTime(notification.createdAt)}</time>
                    </div>
                  </Link>
                  {onRemove && (
                    <button
                      type="button" aria-label={`${notification.title} 알림 지우기`} onClick={() => onRemove(notification.id)}
                      className="absolute top-2.5 right-2.5 rounded-md p-1 text-ink-mute hover:bg-white hover:text-danger focus-visible:outline-2 focus-visible:outline-woori-blue"
                    >
                      <X size={16} aria-hidden="true" />
                    </button>
                  )}
                </li>
              )
            })}
            {notifications.length === 0 && <li role="status" className="px-4 py-8 text-center text-label text-ink-sub">{isPending ? '알림을 불러오는 중이에요.' : '아직 알림이 없어요.'}</li>}
          </ul>
        </div>
      )}
    </div>
  )
}
