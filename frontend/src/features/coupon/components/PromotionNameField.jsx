import { Pencil } from 'lucide-react'
import { Label, P, Pill } from '@/components/common/ui'
import { useCouponDraft } from '@/features/coupon/useCouponDraft'

/** 프로모션 이름 입력 — AI가 지은 이름을 사장님이 바꿀 수 있음 (최대 20자) */
export default function PromotionNameField({ help }) {
  const name = useCouponDraft((s) => s.promotionName)
  const setName = useCouponDraft((s) => s.setPromotionName)
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1.5">
        <Label>프로모션 이름</Label>
        <Pill>AI 추천</Pill>
      </div>
      <div className="flex h-[52px] items-center gap-2 rounded-input bg-surface-muted px-4 ring-[1.5px] ring-woori-deep">
        <input
          value={name}
          maxLength={20}
          onChange={(e) => setName(e.target.value)}
          className="min-w-0 flex-1 bg-transparent text-body font-medium text-ink outline-none"
          aria-label="프로모션 이름"
        />
        <span className="num text-caption text-ink-mute">{name.length}/20</span>
        <Pencil size={18} className="text-woori-deep" />
      </div>
      <P tone="mute" small>
        {help}
      </P>
    </div>
  )
}
