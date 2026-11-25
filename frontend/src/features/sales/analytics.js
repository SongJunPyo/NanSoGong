/** 판매일은 서버의 한국 영업일(YYYY-MM-DD)을 그대로 비교한다. */
export const formatSalesDate = (date, year = false) => {
  const [y, m, d] = date.split('-').map(Number)
  return `${year ? `${y}.` : ''}${m}.${d}`
}

export const salesDateRangeLabel = ({ from, to }) => `${formatSalesDate(from)} – ${formatSalesDate(to)}`

export function previousMonth(date) {
  const [year, month, day] = date.split('-').map(Number)
  const last = new Date(Date.UTC(year, month - 1, 0)).getUTCDate()
  const shifted = new Date(Date.UTC(year, month - 2, Math.min(day, last)))
  return shifted.toISOString().slice(0, 10)
}

export function aggregateSales(records, range) {
  const days = records.filter((record) => record.date >= range.from && record.date <= range.to).toSorted((a, b) => a.date.localeCompare(b.date))
  const amount = days.reduce((total, record) => total + record.amount, 0)
  const orders = days.reduce((total, record) => total + record.orders, 0)
  const hours = Array.from({ length: 14 }, (_, index) => {
    const hour = index + 8
    const entries = days.flatMap((day) => day.hours.filter((entry) => entry.hour === hour))
    return {
      hour,
      // 미수신일은 0원으로 채우지 않고 실제 자료가 있는 날짜만 평균의 분모로 쓴다.
      amount: entries.length ? Math.round(entries.reduce((sum, entry) => sum + entry.amount, 0) / entries.length) : 0,
      orders: entries.length ? Math.round(entries.reduce((sum, entry) => sum + entry.orders, 0) / entries.length * 10) / 10 : 0,
    }
  })
  return { days, amount, orders, average: orders ? Math.round(amount / orders) : 0, hours }
}

export function smoothSalesPath(points) {
  return points.map((point, index) => {
    if (index === 0) return `M ${point.x} ${point.y}`
    const previous = points[index - 1]
    const middle = (previous.x + point.x) / 2
    return `C ${middle} ${previous.y}, ${middle} ${point.y}, ${point.x} ${point.y}`
  }).join(' ')
}
