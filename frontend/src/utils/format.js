const seoulDate = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit',
})
const seoulTime = new Intl.DateTimeFormat('ko-KR', {
  timeZone: 'Asia/Seoul', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
})
const seoulWeekday = new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', weekday: 'short' })

export function todayDateKey(date = new Date()) {
  const parts = Object.fromEntries(seoulDate.formatToParts(date).map(({ type, value }) => [type, value]))
  return `${parts.year}-${parts.month}-${parts.day}`
}

export function formatCalendarMonth(dateKey) {
  const [year, month] = dateKey.split('-').map(Number)
  return `${year}년 ${month}월`
}

export function formatStoreDate(date = new Date()) {
  const [, month, day] = todayDateKey(date).split('-').map(Number)
  return `${month}.${day} ${seoulWeekday.format(date)}`
}

export function formatCalendarDate(dateKey) {
  const [, month, day] = dateKey.split('-').map(Number)
  return `${month}월 ${day}일`
}

export function formatNotificationTime(timestamp) {
  const date = new Date(timestamp)
  const time = seoulTime.format(date)
  const dateKey = todayDateKey(date)
  return dateKey === todayDateKey() ? time : `${formatCalendarDate(dateKey)} ${time}`
}
