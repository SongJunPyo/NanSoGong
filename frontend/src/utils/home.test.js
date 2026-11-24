import test from 'node:test'
import assert from 'node:assert/strict'
import { getCalendarDays, getHomeEventsForDate, shiftCalendarMonth, sortHomeNotifications } from './home.js'
import { formatStoreDate, todayDateKey } from './format.js'

test('달력은 일요일부터 시작하고 5~6주 동안 그 달 전체를 포함한다', () => {
  for (const month of ['2026-11-01', '2026-05-01', '2026-02-01', '2024-02-01']) {
    const days = getCalendarDays(month)
    assert.ok([35, 42].includes(days.length))
    assert.equal(new Date(`${days[0]}T00:00:00Z`).getUTCDay(), 0)
    assert.equal(new Date(`${days.at(-1)}T00:00:00Z`).getUTCDay(), 6)
    assert.ok(days.includes(month))
    assert.equal(new Set(days).size, days.length)
  }
  assert.ok(getCalendarDays('2024-02-01').includes('2024-02-29'))
  assert.equal(getCalendarDays('2026-05-01').length, 42)
  assert.equal(getCalendarDays('2026-02-01').filter((day) => day.startsWith('2026-02')).length, 28)
})

test('월 이동은 연말·연초와 월말 날짜를 처리한다', () => {
  assert.equal(shiftCalendarMonth('2026-12-31', 1), '2027-01-01')
  assert.equal(shiftCalendarMonth('2027-01-31', -1), '2026-12-01')
  assert.equal(shiftCalendarMonth('2026-03-31', -1), '2026-02-01')
})

test('기간 일정은 시작일·종료일을 모두 포함하고 다른 달에도 이어진다', () => {
  const events = [
    { id: 'promotion', startDate: '2026-11-20', endDate: '2026-11-24' },
    { id: 'festival', startDate: '2026-11-22', endDate: '2026-11-23' },
    { id: 'cross-month', startDate: '2026-11-30', endDate: '2026-12-02' },
    { id: 'one-day', startDate: '2026-11-24' },
  ]
  assert.deepEqual(getHomeEventsForDate(events, '2026-11-22').map((event) => event.id), ['promotion', 'festival'])
  assert.deepEqual(getHomeEventsForDate(events, '2026-11-24').map((event) => event.id), ['promotion', 'one-day'])
  assert.deepEqual(getHomeEventsForDate(events, '2026-12-02').map((event) => event.id), ['cross-month'])
  assert.deepEqual(getHomeEventsForDate(events, '2026-12-03'), [])
})

test('브리핑은 중요도순, 드롭다운은 최신순이며 원본 배열을 변경하지 않는다', () => {
  const notifications = [
    { id: 'normal', severity: 'normal', createdAt: '2026-11-24T09:30:00+09:00' },
    { id: 'urgent-old', severity: 'urgent', createdAt: '2026-11-24T08:20:00+09:00' },
    { id: 'warning', severity: 'warning', createdAt: '2026-11-24T09:10:00+09:00' },
    { id: 'urgent-new', severity: 'urgent', createdAt: '2026-11-24T09:20:00+09:00' },
  ]
  const original = structuredClone(notifications)
  assert.deepEqual(sortHomeNotifications(notifications).map((item) => item.id), ['urgent-new', 'urgent-old', 'warning', 'normal'])
  assert.deepEqual(sortHomeNotifications(notifications, false).map((item) => item.id), ['normal', 'urgent-new', 'warning', 'urgent-old'])
  assert.deepEqual(notifications, original)
})

test('오늘 날짜는 실행 환경의 시간대와 관계없이 한국 시간을 사용한다', () => {
  assert.equal(todayDateKey(new Date('2026-11-23T14:59:59Z')), '2026-11-23')
  assert.equal(todayDateKey(new Date('2026-11-23T15:00:00Z')), '2026-11-24')
  assert.equal(formatStoreDate(new Date('2026-11-23T15:00:00Z')), '11.24 화')
})
