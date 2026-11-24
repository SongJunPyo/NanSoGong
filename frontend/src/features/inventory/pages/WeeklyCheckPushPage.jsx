import { Link } from 'react-router-dom'

/** 23-0 주간 재고 정비 알림 — 잠금화면 푸시 예시 (UF-11 1) */
export default function WeeklyCheckPushPage() {
  return (
    <div className="flex min-h-dvh flex-col items-center gap-1.5 bg-gradient-to-b from-[#0a2954] to-woori-deep px-screen pt-[120px]">
      <p className="num text-[72px] font-bold leading-none text-white">9:00</p>
      <p className="text-[17px] font-medium text-[#d9ebfa]">11월 23일 월요일</p>
      <Link
        to="/inventory/adjust"
        className="mt-10 flex w-full flex-col gap-1.5 rounded-[20px] bg-white/95 px-4 py-3.5"
      >
        <div className="flex items-center gap-2">
          <span className="size-[22px] rounded-md bg-gradient-to-br from-woori-sky to-woori-deep" />
          <span className="text-[13px] font-medium text-ink-sub">매장 운영 에이전트</span>
          <span className="ml-auto text-xs text-ink-mute">지금</span>
        </div>
        <p className="text-[15px] font-bold text-ink">이번 주 재고 정비할 시간이에요</p>
        <p className="text-label text-ink-sub">
          추정 재고와 실제 수량이 다를 수 있는 품목 5개만 확인하면 돼요. 3분이면 끝나요.
        </p>
      </Link>
    </div>
  )
}
