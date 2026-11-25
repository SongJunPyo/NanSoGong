import assert from 'node:assert/strict'
import test from 'node:test'
import { aggregateSales, previousMonth } from './analytics.js'
import { salesAnalytics, salesSummary } from './mock.js'

test('일별·시간별 예시는 기존 월 누적 매출과 주문 합계를 보존한다', () => {
  const result = aggregateSales(salesAnalytics.days, salesAnalytics.defaultRange)
  assert.equal(result.amount, salesSummary.month.amount)
  assert.equal(result.orders, salesSummary.month.orders)
  assert.equal(result.average, salesSummary.month.avg)
  for (const day of result.days) {
    assert.equal(day.hours.reduce((sum, hour) => sum + hour.amount, 0), day.amount)
    assert.equal(day.hours.reduce((sum, hour) => sum + hour.orders, 0), day.orders)
  }
})

test('양 끝 날짜를 포함하고 미수신일을 평균의 분모에서 제외한다', () => {
  const records = [
    { date: '2026-11-01', amount: 1000, orders: 2, hours: [{ hour: 8, amount: 1000, orders: 2 }] },
    { date: '2026-11-03', amount: 3000, orders: 6, hours: [{ hour: 8, amount: 3000, orders: 6 }] },
    { date: '2026-11-04', amount: 9000, orders: 9, hours: [{ hour: 8, amount: 9000, orders: 9 }] },
  ]
  const result = aggregateSales(records, { from: '2026-11-01', to: '2026-11-03' })
  assert.equal(result.days.length, 2)
  assert.equal(result.amount, 4000)
  assert.equal(result.orders, 8)
  assert.equal(result.hours[0].amount, 2000)
  assert.equal(result.hours[0].orders, 4)
  const single = aggregateSales(records, { from: '2026-11-03', to: '2026-11-03' })
  assert.equal(single.amount, 3000)
  assert.equal(single.hours[0].amount, 3000)
})

test('자료 없는 기간과 주문 0건을 안전하게 처리한다', () => {
  const empty = aggregateSales(salesAnalytics.days, { from: '2026-12-01', to: '2026-12-31' })
  assert.equal(empty.days.length, 0)
  assert.equal(empty.average, 0)
  assert.ok(empty.hours.every((hour) => hour.amount === 0 && hour.orders === 0))
  const zero = aggregateSales([{ date: '2026-11-01', amount: 0, orders: 0, hours: [] }], salesAnalytics.defaultRange)
  assert.equal(zero.days.length, 1)
  assert.equal(zero.average, 0)
})

test('전월 비교는 연도 경계와 윤년·월말을 올바르게 계산한다', () => {
  assert.equal(previousMonth('2026-01-31'), '2025-12-31')
  assert.equal(previousMonth('2026-03-31'), '2026-02-28')
  assert.equal(previousMonth('2024-03-31'), '2024-02-29')
})
