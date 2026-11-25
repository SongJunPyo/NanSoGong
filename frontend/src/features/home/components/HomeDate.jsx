import { formatStoreDate } from '@/utils/format'

/** 홈 오른쪽 위 날짜 */
export default function HomeDate() {
  return <span className="num shrink-0 text-[17px] font-bold whitespace-nowrap text-woori-deep lg:text-[18px]">{formatStoreDate()}</span>
}
