import { WEEK_DAYS } from './auth.js'

export function storeFormValues(store) {
  const hours = Object.values(store.openHours ?? {})[0] ?? []
  return {
    name: store.name ?? '', category: store.category ?? '', address: store.address ?? '',
    openTime: hours[0] ?? '', closeTime: hours[1] ?? '', closedDays: [...(store.closedDays ?? [])],
  }
}

/** 현재 PUT은 공통 영업시간으로 주간 시간표를 재작성한다. 기존 표와 같을 때만 무확인 저장한다. */
export function hasUniformStoreHours(store) {
  const { openTime, closeTime, closedDays } = storeFormValues(store)
  const expected = WEEK_DAYS.map(([day]) => day).filter((day) => openTime && !closedDays.includes(day))
  const actual = Object.entries(store.openHours ?? {})
  return expected.length === actual.length && actual.every(([day, hours]) => expected.includes(day) && Array.isArray(hours) && hours.length === 2 && hours[0] === openTime && hours[1] === closeTime)
}
