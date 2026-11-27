import { formatStoreDate } from '@/utils/format'

/** 홈 오른쪽 위 날짜 — 좁은 휴대폰에서는 매장명 · 제목이 잘리지 않게 숨긴다 (아래 매출 카드에 기준 시각이 있다) */
export default function HomeDate() {
  return <span className="num hidden shrink-0 text-[17px] sm:inline font-bold whitespace-nowrap text-ink lg:text-[18px]">{formatStoreDate()}</span>
}
