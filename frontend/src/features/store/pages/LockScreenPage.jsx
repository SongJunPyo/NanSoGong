import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Delete, Lock } from 'lucide-react'
import { Screen } from '@/components/common/layout'
import { Button } from '@/components/common/ui'
import { cn } from '@/lib/utils'

/** 57 잠금 화면 */
export default function LockScreenPage() {
  const [pin, setPin] = useState('')
  const navigate = useNavigate()
  const press = (k) => {
    if (k === 'del') return setPin(pin.slice(0, -1))
    const next = (pin + k).slice(0, 6)
    setPin(next)
    if (next.length === 6) setTimeout(() => navigate('/sales'), 150)
  }
  return (
    <Screen title="매출" center>
      <Lock size={40} className="mt-8 text-woori-deep" fill="currentColor" fillOpacity={0.15} />
      <p className="text-center text-[20px] font-bold text-ink whitespace-pre-line">
        {'매출 정보를 보려면\n비밀번호를 입력하세요'}
      </p>
      <div className="flex gap-3.5">
        {Array.from({ length: 6 }, (_, i) => (
          <span key={i} className={cn('size-3.5 rounded-full', i < pin.length ? 'bg-woori-deep' : 'bg-line')} />
        ))}
      </div>
      <div className="grid w-full grid-cols-3 gap-2">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'].map((k, i) =>
          k === '' ? (
            <span key={i} />
          ) : (
            <button
              key={i}
              type="button"
              onClick={() => press(k)}
              className="flex h-14 items-center justify-center rounded-[14px] bg-surface-muted text-[22px] font-medium text-ink"
            >
              {k === 'del' ? <Delete size={22} /> : k}
            </button>
          ),
        )}
      </div>
      <Button variant="text">생체 인증으로 열기</Button>
    </Screen>
  )
}
